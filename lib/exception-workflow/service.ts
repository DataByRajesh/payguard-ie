import { prisma } from "@/lib/db";
import { assertTransition } from "./stateMachine";
import { assessResolutionReadiness } from "./resolution";
import { assessApprovalEligibility, assessRejectionEligibility } from "./approval";
import {
  createAuditEvent,
  createExceptionEvidence,
  createNote,
  getExceptionCaseForMutation,
  updateExceptionWithVersionCheck,
} from "./persistence";
import type { ExceptionStatusValue } from "./types";

export class ExceptionNotFoundError extends Error {
  constructor(id: string) {
    super(`Exception case ${id} was not found.`);
    this.name = "ExceptionNotFoundError";
  }
}

export class DomainValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "DomainValidationError";
  }
}

async function requireException(id: string) {
  const exceptionCase = await getExceptionCaseForMutation(id);
  if (!exceptionCase) throw new ExceptionNotFoundError(id);
  return exceptionCase;
}

export interface MutationContext {
  expectedVersion: number;
  now: Date;
  actorName: string;
  actorUserId: string;
}

export async function assignException(
  exceptionId: string,
  params: MutationContext & { assignToUserId: string; assigneeName: string; note: string | null; assignedByUserId: string },
) {
  const exceptionCase = await requireException(exceptionId);
  const status = exceptionCase.status as ExceptionStatusValue;

  if (status === "RESOLVED" || status === "CLOSED") {
    throw new DomainValidationError(["A resolved or closed case cannot be assigned or reassigned."]);
  }

  let newStatus: ExceptionStatusValue = status;
  if (status === "NEW") {
    assertTransition("NEW", "ASSIGNED");
    newStatus = "ASSIGNED";
  }
  // Reassignment on ASSIGNED/INVESTIGATING/AWAITING_INFORMATION does not change status.

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {
      status: newStatus,
      assignedUserId: params.assignToUserId,
      assignedByUserId: params.assignedByUserId,
      assignedAt: params.now,
      assignmentNote: params.note,
    });
    const verb = exceptionCase.assignedUserId ? "Reassigned" : "Assigned";
    await createAuditEvent(
      tx,
      exceptionId,
      exceptionCase.assignedUserId ? "EXCEPTION_REASSIGNED" : "EXCEPTION_ASSIGNED",
      `${verb} to ${params.assigneeName} by ${params.actorName}.`,
      params.actorUserId,
      params.now,
    );
    return updated;
  });
}

async function transitionStatus(
  exceptionId: string,
  params: MutationContext,
  from: ExceptionStatusValue,
  to: ExceptionStatusValue,
  action: string,
  summary: string,
) {
  const exceptionCase = await requireException(exceptionId);
  assertTransition(exceptionCase.status as ExceptionStatusValue, to);
  void from;

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, { status: to });
    await createAuditEvent(tx, exceptionId, action, summary, params.actorUserId, params.now);
    return updated;
  });
}

export async function startInvestigation(exceptionId: string, params: MutationContext) {
  return transitionStatus(
    exceptionId,
    params,
    "ASSIGNED",
    "INVESTIGATING",
    "EXCEPTION_STATUS_CHANGED",
    `${params.actorName} started investigation.`,
  );
}

export async function requestInformation(exceptionId: string, params: MutationContext) {
  return transitionStatus(
    exceptionId,
    params,
    "INVESTIGATING",
    "AWAITING_INFORMATION",
    "EXCEPTION_STATUS_CHANGED",
    `${params.actorName} marked the case as awaiting information.`,
  );
}

export async function resumeInvestigation(exceptionId: string, params: MutationContext) {
  return transitionStatus(
    exceptionId,
    params,
    "AWAITING_INFORMATION",
    "INVESTIGATING",
    "EXCEPTION_STATUS_CHANGED",
    `${params.actorName} resumed investigation.`,
  );
}

export async function addNoteToException(
  exceptionId: string,
  params: MutationContext & { noteType: string; content: string; authorUserId: string },
) {
  const exceptionCase = await requireException(exceptionId);

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {});
    await createNote(tx, {
      exceptionCaseId: exceptionId,
      noteType: params.noteType,
      content: params.content,
      authorUserId: params.authorUserId,
      createdAt: params.now,
    });
    // Deliberately does not copy the note body into the audit summary.
    await createAuditEvent(tx, exceptionId, "EXCEPTION_NOTE_ADDED", `${params.actorName} added a ${params.noteType.toLowerCase()} note.`, params.actorUserId, params.now);
    void exceptionCase;
    return updated;
  });
}

export async function recordRootCause(
  exceptionId: string,
  params: MutationContext & { rootCauseCategory: string; rootCauseSummary: string; identifiedByUserId: string },
) {
  const exceptionCase = await requireException(exceptionId);
  const status = exceptionCase.status as ExceptionStatusValue;
  if (status !== "INVESTIGATING" && status !== "AWAITING_INFORMATION") {
    throw new DomainValidationError(["Root cause can only be recorded while a case is under investigation."]);
  }

  const isUpdate = exceptionCase.rootCauseCategory !== null;

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {
      rootCauseCategory: params.rootCauseCategory as never,
      rootCauseSummary: params.rootCauseSummary,
      rootCauseIdentifiedById: params.identifiedByUserId,
      rootCauseIdentifiedAt: params.now,
    });
    await createAuditEvent(
      tx,
      exceptionId,
      isUpdate ? "ROOT_CAUSE_UPDATED" : "ROOT_CAUSE_RECORDED",
      `${params.actorName} ${isUpdate ? "updated" : "recorded"} the root cause (${params.rootCauseCategory}).`,
      params.actorUserId,
      params.now,
    );
    return updated;
  });
}

export async function submitResolution(
  exceptionId: string,
  params: MutationContext & { resolutionAction: string; resolutionSummary: string; resolutionUserId: string },
) {
  const exceptionCase = await requireException(exceptionId);
  const readiness = assessResolutionReadiness({
    status: exceptionCase.status as ExceptionStatusValue,
    assignedUserId: exceptionCase.assignedUserId,
    rootCauseCategory: exceptionCase.rootCauseCategory,
    rootCauseSummary: exceptionCase.rootCauseSummary,
  });
  if (!readiness.ready) {
    throw new DomainValidationError(readiness.reasons);
  }
  assertTransition(exceptionCase.status as ExceptionStatusValue, "RESOLVED");

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {
      status: "RESOLVED",
      resolutionAction: params.resolutionAction as never,
      resolutionSummary: params.resolutionSummary,
      resolutionUserId: params.resolutionUserId,
      resolutionAt: params.now,
      resolvedAt: params.now,
    });
    await createAuditEvent(tx, exceptionId, "RESOLUTION_SUBMITTED", `${params.actorName} submitted a resolution (${params.resolutionAction}).`, params.actorUserId, params.now);
    return updated;
  });
}

export async function approveException(
  exceptionId: string,
  params: MutationContext & { approverUserId: string; approvalNote: string | null },
) {
  const exceptionCase = await requireException(exceptionId);
  const readiness = assessApprovalEligibility({
    status: exceptionCase.status as ExceptionStatusValue,
    resolutionUserId: exceptionCase.resolutionUserId,
    reviewerUserId: params.approverUserId,
    evidenceCount: exceptionCase.evidenceRecords.length,
  });
  if (!readiness.ready) {
    throw new DomainValidationError(readiness.reasons);
  }
  assertTransition("RESOLVED", "CLOSED");

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {
      status: "CLOSED",
      approvalDecision: "APPROVED",
      approverUserId: params.approverUserId,
      approvalNote: params.approvalNote,
      approvalAt: params.now,
      closedAt: params.now,
    });
    await createAuditEvent(tx, exceptionId, "EXCEPTION_APPROVED", `${params.actorName} approved and closed the case.`, params.actorUserId, params.now);
    return updated;
  });
}

export async function rejectException(
  exceptionId: string,
  params: MutationContext & { approverUserId: string; approvalNote: string | null },
) {
  const exceptionCase = await requireException(exceptionId);
  const readiness = assessRejectionEligibility({
    status: exceptionCase.status as ExceptionStatusValue,
    resolutionUserId: exceptionCase.resolutionUserId,
    reviewerUserId: params.approverUserId,
  });
  if (!readiness.ready) {
    throw new DomainValidationError(readiness.reasons);
  }
  assertTransition("RESOLVED", "INVESTIGATING");

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {
      status: "INVESTIGATING",
      approvalDecision: "REJECTED",
      approverUserId: params.approverUserId,
      approvalNote: params.approvalNote,
      approvalAt: params.now,
    });
    await createAuditEvent(tx, exceptionId, "RESOLUTION_REJECTED", `${params.actorName} rejected the resolution and reopened investigation.`, params.actorUserId, params.now);
    return updated;
  });
}

export async function addEvidenceToException(
  exceptionId: string,
  params: MutationContext & {
    evidenceType: string;
    title: string;
    description: string | null;
    fileReference: string | null;
    addedByUserId: string;
  },
) {
  await requireException(exceptionId);

  return prisma.$transaction(async (tx) => {
    const updated = await updateExceptionWithVersionCheck(tx, exceptionId, params.expectedVersion, {});
    const evidence = await createExceptionEvidence(tx, {
      exceptionCaseId: exceptionId,
      type: params.evidenceType,
      title: params.title,
      description: params.description,
      fileReference: params.fileReference,
      addedByUserId: params.addedByUserId,
      createdAt: params.now,
    });
    await createAuditEvent(tx, exceptionId, "EVIDENCE_ADDED", `${params.actorName} added evidence (${evidence.evidenceRef}).`, params.actorUserId, params.now);
    return { exceptionCase: updated, evidence };
  });
}
