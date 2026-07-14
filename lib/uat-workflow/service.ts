import { prisma } from "@/lib/db";

export class UatTestCaseNotFoundError extends Error {
  constructor(id: string) {
    super(`UAT test case ${id} was not found.`);
    this.name = "UatTestCaseNotFoundError";
  }
}

async function createAuditEvent(entityId: string, action: string, summary: string, actorUserId: string, createdAt: Date) {
  await prisma.auditEvent.create({ data: { entityType: "UAT_EXECUTION", entityId, action, summary, actorUserId, createdAt } });
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
    params.testerUserId,
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
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  addedByUserId: string;
  actorName: string;
  now: Date;
}) {
  const execution = await prisma.uATExecution.findUnique({ where: { id: params.executionId } });
  if (!execution) throw new UatTestCaseNotFoundError(params.executionId);

  // The reference count-then-create must happen inside one transaction — otherwise two
  // concurrent evidence adds (e.g. one from the UAT workspace, one from the exception workspace)
  // could read the same count and collide on the column's unique constraint.
  const evidence = await prisma.$transaction(async (tx) => {
    const count = await tx.evidenceRecord.count();
    const evidenceRef = `EVD-${String(count + 1).padStart(6, "0")}`;
    return tx.evidenceRecord.create({
      data: {
        uatExecutionId: params.executionId,
        evidenceRef,
        type: params.evidenceType as never,
        title: params.title,
        description: params.description,
        fileReference: params.fileReference,
        storageProvider: params.storageProvider as never,
        storageKey: params.storageKey,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        addedByUserId: params.addedByUserId,
        capturedAt: params.now,
        createdAt: params.now,
      },
    });
  });

  await createAuditEvent(params.executionId, "UAT_EVIDENCE_ADDED", `${params.actorName} added evidence (${evidence.evidenceRef}).`, params.addedByUserId, params.now);

  return evidence;
}
