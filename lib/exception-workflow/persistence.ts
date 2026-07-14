import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

export class ConcurrencyConflictError extends Error {
  constructor() {
    super("This case was changed by someone else since you loaded it. Reload and try again.");
    this.name = "ConcurrencyConflictError";
  }
}

export async function getExceptionCaseForMutation(id: string) {
  return prisma.exceptionCase.findUnique({
    where: { id },
    include: { evidenceRecords: true },
  });
}

export async function createAuditEvent(
  tx: Prisma.TransactionClient,
  entityId: string,
  action: string,
  summary: string,
  actorUserId: string,
  createdAt?: Date,
) {
  await tx.auditEvent.create({
    data: { entityType: "EXCEPTION_CASE", entityId, action, summary, actorUserId, createdAt },
  });
}

/**
 * Version-checked update: throws ConcurrencyConflictError if the row's version no longer
 * matches `expectedVersion` (someone else mutated it since the caller read it), otherwise
 * applies `data` and increments the version. Runs inside the caller-supplied transaction so
 * the state change and any related writes (notes, evidence, audit events) commit atomically.
 */
export async function updateExceptionWithVersionCheck(
  tx: Prisma.TransactionClient,
  id: string,
  expectedVersion: number,
  data: Prisma.ExceptionCaseUncheckedUpdateInput,
) {
  const result = await tx.exceptionCase.updateMany({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new ConcurrencyConflictError();
  }

  return tx.exceptionCase.findUniqueOrThrow({ where: { id } });
}

export async function createNote(
  tx: Prisma.TransactionClient,
  params: { exceptionCaseId: string; noteType: string; content: string; authorUserId: string; createdAt: Date },
) {
  return tx.exceptionComment.create({
    data: {
      exceptionCaseId: params.exceptionCaseId,
      noteType: params.noteType as never,
      body: params.content,
      authorUserId: params.authorUserId,
      createdAt: params.createdAt,
    },
  });
}

/**
 * Generates the next evidence reference and creates the record inside the same transaction —
 * both must happen atomically (not a separate pre-transaction count()) so two concurrent evidence
 * adds can never compute the same reference and collide against the column's unique constraint.
 */
export async function createExceptionEvidence(
  tx: Prisma.TransactionClient,
  params: {
    exceptionCaseId: string;
    type: string;
    title: string;
    description: string | null;
    fileReference: string | null;
    storageProvider: string | null;
    storageKey: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    addedByUserId: string;
    createdAt: Date;
  },
) {
  const count = await tx.evidenceRecord.count();
  const evidenceRef = `EVD-${String(count + 1).padStart(6, "0")}`;
  return tx.evidenceRecord.create({
    data: {
      exceptionCaseId: params.exceptionCaseId,
      evidenceRef,
      type: params.type as never,
      title: params.title,
      description: params.description,
      fileReference: params.fileReference,
      storageProvider: params.storageProvider as never,
      storageKey: params.storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      addedByUserId: params.addedByUserId,
      capturedAt: params.createdAt,
      createdAt: params.createdAt,
    },
  });
}
