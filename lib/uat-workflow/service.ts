import { prisma } from "@/lib/db";

export class UatTestCaseNotFoundError extends Error {
  constructor(id: string) {
    super(`UAT test case ${id} was not found.`);
    this.name = "UatTestCaseNotFoundError";
  }
}

async function createAuditEvent(entityId: string, action: string, summary: string, actor: string, createdAt: Date) {
  await prisma.auditEvent.create({ data: { entityType: "UAT_EXECUTION", entityId, action, summary, actor, createdAt } });
}

async function nextEvidenceReference(): Promise<string> {
  const count = await prisma.evidenceRecord.count();
  return `EVD-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Records a new execution for a test case. Deliberately never auto-creates an ExceptionCase —
 * a failed execution may only be *manually* linked to an existing one (linkedExceptionCaseId),
 * per the Sprint 3 spec's explicit "do not automatically generate payment exceptions from UAT
 * failures" rule.
 */
export async function executeUatCase(params: {
  testCaseId: string;
  status: string;
  actualResult: string | null;
  notes: string | null;
  testerUserId: string;
  testerName: string;
  linkedExceptionCaseId: string | null;
  now: Date;
}) {
  const testCase = await prisma.uATTestCase.findUnique({ where: { id: params.testCaseId } });
  if (!testCase) throw new UatTestCaseNotFoundError(params.testCaseId);

  const execution = await prisma.uATExecution.create({
    data: {
      uatTestCaseId: params.testCaseId,
      status: params.status as never,
      executedAt: params.now,
      testerUserId: params.testerUserId,
      actualResult: params.actualResult,
      notes: params.notes,
      linkedExceptionCaseId: params.linkedExceptionCaseId,
      createdAt: params.now,
    },
  });

  await createAuditEvent(
    execution.id,
    "UAT_EXECUTED",
    `${params.testerName} executed ${testCase.testCaseRef} with result ${params.status}.`,
    params.testerName,
    params.now,
  );

  return execution;
}

export async function addUatEvidence(params: {
  executionId: string;
  evidenceType: string;
  title: string;
  description: string | null;
  fileReference: string | null;
  addedByUserId: string;
  actorName: string;
  now: Date;
}) {
  const execution = await prisma.uATExecution.findUnique({ where: { id: params.executionId } });
  if (!execution) throw new UatTestCaseNotFoundError(params.executionId);

  const evidenceRef = await nextEvidenceReference();
  const evidence = await prisma.evidenceRecord.create({
    data: {
      uatExecutionId: params.executionId,
      evidenceRef,
      type: params.evidenceType as never,
      title: params.title,
      description: params.description,
      fileReference: params.fileReference,
      addedByUserId: params.addedByUserId,
      capturedAt: params.now,
      createdAt: params.now,
    },
  });

  await createAuditEvent(params.executionId, "UAT_EVIDENCE_ADDED", `${params.actorName} added evidence (${evidence.evidenceRef}).`, params.actorName, params.now);

  return evidence;
}
