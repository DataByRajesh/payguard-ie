import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ConcurrencyConflictError } from "./persistence";
import {
  DomainValidationError,
  addEvidenceToException,
  approveException,
  assignException,
  recordRootCause,
  rejectException,
  requestInformation,
  resumeInvestigation,
  startInvestigation,
  submitResolution,
} from "./service";

/**
 * These specs exercise the real service + persistence layers against a disposable SQLite
 * database (provisioned by `npm run pretest` / scripts/setup-vitest-db.ts), not mocks — the
 * behaviour under test (optimistic-concurrency conflicts, audit-event writes, transactional
 * atomicity) only exists at the Prisma boundary, so pure-function unit tests can't cover it.
 */

async function resetDatabase() {
  await prisma.evidenceRecord.deleteMany();
  await prisma.uATExecution.deleteMany();
  await prisma.uATTestCase.deleteMany();
  await prisma.exceptionComment.deleteMany();
  await prisma.exceptionCase.deleteMany();
  await prisma.reconciliationResult.deleteMany();
  await prisma.reconciliationRun.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
}

async function createFixture() {
  const analyst = await prisma.user.create({ data: { email: "analyst@test.local", name: "Test Analyst", role: "OPS_ANALYST" } });
  const approver = await prisma.user.create({ data: { email: "approver@test.local", name: "Test Approver", role: "OPS_ANALYST" } });
  const customer = await prisma.customer.create({ data: { customerRef: "IE00TEST0000000001", displayName: "Test Customer", country: "IE" } });
  const payment = await prisma.payment.create({
    data: {
      paymentReference: "PAY-TEST-000001",
      customerId: customer.id,
      amountMinor: 10000,
      currency: "EUR",
      paymentMethod: "SEPA_CREDIT_TRANSFER",
      status: "COMPLETED",
      expectedSettlementAt: new Date(),
    },
  });
  const exceptionCase = await prisma.exceptionCase.create({
    data: {
      caseReference: "EXC-TEST-000001",
      paymentId: payment.id,
      type: "MISSING_SETTLEMENT",
      severity: "MEDIUM",
      status: "NEW",
      title: "Test exception",
      description: "Fixture exception for service-layer tests.",
      dedupeKey: `${payment.id}:none:MISSING_SETTLEMENT`,
      source: "SYSTEM",
    },
  });
  return { analyst, approver, customer, payment, exceptionCase };
}

const now = new Date("2026-01-01T00:00:00.000Z");

describe("exception-workflow service (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("assigns an exception, transitions NEW -> ASSIGNED, and records an audit event", async () => {
    const { analyst, exceptionCase } = await createFixture();

    const updated = await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });

    expect(updated.status).toBe("ASSIGNED");
    expect(updated.assignedUserId).toBe(analyst.id);
    expect(updated.version).toBe(exceptionCase.version + 1);

    const events = await prisma.auditEvent.findMany({ where: { entityType: "EXCEPTION_CASE", entityId: exceptionCase.id } });
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe("EXCEPTION_ASSIGNED");
  });

  it("rejects a mutation submitted with a stale version (optimistic-concurrency conflict)", async () => {
    const { analyst, exceptionCase } = await createFixture();

    await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });

    // Re-using the original (now stale) version simulates two people acting on the same
    // page load — the second mutation must be rejected rather than silently overwriting.
    await expect(
      startInvestigation(exceptionCase.id, { expectedVersion: exceptionCase.version, now, actorName: analyst.name }),
    ).rejects.toThrow(ConcurrencyConflictError);
  });

  it("blocks resolution submission until a root cause has been recorded", async () => {
    const { analyst, exceptionCase } = await createFixture();

    const assigned = await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });
    const investigating = await startInvestigation(exceptionCase.id, { expectedVersion: assigned.version, now, actorName: analyst.name });

    await expect(
      submitResolution(exceptionCase.id, {
        expectedVersion: investigating.version,
        now,
        actorName: analyst.name,
        resolutionAction: "NO_ISSUE_FOUND",
        resolutionSummary: "Attempting to resolve without a root cause.",
        resolutionUserId: analyst.id,
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("requires a different user to approve than the one who resolved the case", async () => {
    const { analyst, exceptionCase } = await createFixture();

    let current = await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });
    current = await startInvestigation(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name });
    current = await recordRootCause(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      rootCauseCategory: "UNKNOWN",
      rootCauseSummary: "Root cause identified for this test fixture.",
      identifiedByUserId: analyst.id,
    });
    current = await submitResolution(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      resolutionAction: "NO_ISSUE_FOUND",
      resolutionSummary: "No corrective action was required.",
      resolutionUserId: analyst.id,
    });

    await expect(
      approveException(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name, approverUserId: analyst.id, approvalNote: null }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("requires at least one evidence record before an approval can close the case", async () => {
    const { analyst, approver, exceptionCase } = await createFixture();

    let current = await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });
    current = await startInvestigation(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name });
    current = await recordRootCause(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      rootCauseCategory: "UNKNOWN",
      rootCauseSummary: "Root cause identified for this test fixture.",
      identifiedByUserId: analyst.id,
    });
    current = await submitResolution(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      resolutionAction: "NO_ISSUE_FOUND",
      resolutionSummary: "No corrective action was required.",
      resolutionUserId: analyst.id,
    });

    await expect(
      approveException(exceptionCase.id, { expectedVersion: current.version, now, actorName: approver.name, approverUserId: approver.id, approvalNote: null }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("runs the full assign -> investigate -> root cause -> resolve -> evidence -> approve path to CLOSED with a complete audit trail", async () => {
    const { analyst, approver, exceptionCase } = await createFixture();

    let current = await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });
    current = await startInvestigation(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name });
    current = await recordRootCause(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      rootCauseCategory: "SETTLEMENT_FILE_MISSING",
      rootCauseSummary: "The settlement file for this batch never arrived from the provider.",
      identifiedByUserId: analyst.id,
    });
    current = await submitResolution(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      resolutionAction: "CORRECTIVE_SETTLEMENT_APPLIED",
      resolutionSummary: "Requested and applied a replacement settlement file from the provider.",
      resolutionUserId: analyst.id,
    });
    const withEvidence = await addEvidenceToException(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      evidenceType: "QUERY_RESULT",
      title: "Replacement settlement file confirmation",
      description: null,
      fileReference: null,
      addedByUserId: analyst.id,
    });
    const closed = await approveException(exceptionCase.id, {
      expectedVersion: withEvidence.exceptionCase.version,
      now,
      actorName: approver.name,
      approverUserId: approver.id,
      approvalNote: "Confirmed the replacement file resolves the discrepancy.",
    });

    expect(closed.status).toBe("CLOSED");
    expect(closed.approvalDecision).toBe("APPROVED");
    expect(closed.closedAt).not.toBeNull();

    const events = await prisma.auditEvent.findMany({
      where: { entityType: "EXCEPTION_CASE", entityId: exceptionCase.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((event) => event.action)).toEqual([
      "EXCEPTION_ASSIGNED",
      "EXCEPTION_STATUS_CHANGED",
      "ROOT_CAUSE_RECORDED",
      "RESOLUTION_SUBMITTED",
      "EVIDENCE_ADDED",
      "EXCEPTION_APPROVED",
    ]);
  });

  it("rejects a resolution and reopens the case for further investigation", async () => {
    const { analyst, approver, exceptionCase } = await createFixture();

    let current = await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now,
      actorName: analyst.name,
      assignToUserId: analyst.id,
      assigneeName: analyst.name,
      assignedByUserId: analyst.id,
      note: null,
    });
    current = await startInvestigation(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name });
    current = await requestInformation(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name });
    expect(current.status).toBe("AWAITING_INFORMATION");

    current = await resumeInvestigation(exceptionCase.id, { expectedVersion: current.version, now, actorName: analyst.name });
    current = await recordRootCause(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      rootCauseCategory: "UNKNOWN",
      rootCauseSummary: "Root cause identified while awaiting information.",
      identifiedByUserId: analyst.id,
    });
    current = await submitResolution(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: analyst.name,
      resolutionAction: "NO_ISSUE_FOUND",
      resolutionSummary: "No corrective action was required.",
      resolutionUserId: analyst.id,
    });

    const reopened = await rejectException(exceptionCase.id, {
      expectedVersion: current.version,
      now,
      actorName: approver.name,
      approverUserId: approver.id,
      approvalNote: "Please gather more evidence before resolving.",
    });

    expect(reopened.status).toBe("INVESTIGATING");
    expect(reopened.approvalDecision).toBe("REJECTED");
  });
});
