import { prisma } from "@/lib/db";
import { calculateSlaState } from "@/lib/exception-workflow/sla";
import type { ExceptionsQuery } from "@/lib/validation/exceptions";

export async function getRecentExceptionCases(limit = 10) {
  return prisma.exceptionCase.findMany({
    include: { payment: true, assignedUser: true },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

export interface ExceptionQueueSummary {
  open: number;
  unassigned: number;
  overdue: number;
  dueSoon: number;
  resolvedAwaitingApproval: number;
  closed: number;
}

const OPEN_STATUSES = new Set(["NEW", "ASSIGNED", "INVESTIGATING", "AWAITING_INFORMATION"]);

export async function getExceptionQueueSummary(now: Date = new Date()): Promise<ExceptionQueueSummary> {
  const cases = await prisma.exceptionCase.findMany({
    select: { status: true, assignedUserId: true, slaDeadline: true, closedAt: true },
  });

  const summary: ExceptionQueueSummary = { open: 0, unassigned: 0, overdue: 0, dueSoon: 0, resolvedAwaitingApproval: 0, closed: 0 };

  for (const exceptionCase of cases) {
    if (exceptionCase.status === "CLOSED") {
      summary.closed += 1;
      continue;
    }
    if (exceptionCase.status === "RESOLVED") summary.resolvedAwaitingApproval += 1;
    if (OPEN_STATUSES.has(exceptionCase.status)) {
      summary.open += 1;
      if (!exceptionCase.assignedUserId) summary.unassigned += 1;
    }
    const sla = calculateSlaState({ slaDeadline: exceptionCase.slaDeadline, closedAt: exceptionCase.closedAt, now });
    if (sla.state === "OVERDUE") summary.overdue += 1;
    if (sla.state === "DUE_SOON") summary.dueSoon += 1;
  }

  return summary;
}

/**
 * SLA state is derived from `slaDeadline`/`closedAt` vs `now` at read time, not stored, so
 * it (like the "unassigned" filter) is applied in-memory after the native (DB-level) filters —
 * same approach as the Payments page's derived settlement-status filter.
 */
export async function getExceptionCases(filters: ExceptionsQuery, now: Date = new Date()) {
  const cases = await prisma.exceptionCase.findMany({
    where: {
      type: filters.type,
      severity: filters.severity,
      status: filters.status,
      assignedUserId: filters.unassigned ? null : filters.ownerId,
      rootCauseCategory: filters.rootCause,
      ...(filters.q
        ? {
            OR: [
              { caseReference: { contains: filters.q } },
              { payment: { paymentReference: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: { payment: { include: { settlement: true } }, assignedUser: true },
    orderBy: { openedAt: "desc" },
  });

  if (!filters.slaState) {
    return cases;
  }

  return cases.filter((exceptionCase) => {
    const sla = calculateSlaState({ slaDeadline: exceptionCase.slaDeadline, closedAt: exceptionCase.closedAt, now });
    return sla.state === filters.slaState;
  });
}

export async function getExceptionCaseById(id: string) {
  return prisma.exceptionCase.findUnique({
    where: { id },
    include: {
      payment: { include: { settlement: true, customer: true } },
      assignedUser: true,
      assignedByUser: true,
      rootCauseIdentifiedByUser: true,
      resolutionUser: true,
      approverUser: true,
      comments: { include: { authorUser: true }, orderBy: { createdAt: "asc" } },
      evidenceRecords: { include: { addedByUser: true }, orderBy: { createdAt: "asc" } },
      reconciliationResults: { include: { reconciliationRun: true }, orderBy: { createdAt: "asc" } },
      uatExecutions: { include: { uatTestCase: true } },
    },
  });
}
