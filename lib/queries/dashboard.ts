import { prisma } from "@/lib/db";
import { calculateSlaState } from "@/lib/exception-workflow/sla";
import { PAYMENT_STATUS_PRESENTATION } from "@/lib/status";
import type { PaymentStatus } from "@/app/generated/prisma/client";

export interface DashboardSummary {
  totalPayments: number;
  totalSettlements: number;
  statusCounts: { status: PaymentStatus; label: string; count: number }[];
  exceptions: {
    open: number;
    unassigned: number;
    overdue: number;
    dueSoon: number;
    resolvedAwaitingApproval: number;
    closed: number;
  };
  latestReconciliationRun: { id: string; runReference: string; startedAt: Date; status: string; exceptionsCreated: number } | null;
  uat: { pass: number; fail: number; blocked: number; notRun: number };
}

const OPEN_STATUSES = new Set(["NEW", "ASSIGNED", "INVESTIGATING", "AWAITING_INFORMATION"]);

export async function getDashboardSummary(now: Date = new Date()): Promise<DashboardSummary> {
  const [totalPayments, totalSettlements, statusGroups, allExceptions, latestRun, uatGroups] = await Promise.all([
    prisma.payment.count(),
    prisma.settlement.count(),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.exceptionCase.findMany({ select: { status: true, assignedUserId: true, slaDeadline: true, closedAt: true } }),
    prisma.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.uATExecution.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts = statusGroups
    .map((group) => ({
      status: group.status,
      label: PAYMENT_STATUS_PRESENTATION[group.status].label,
      count: group._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  let open = 0;
  let unassigned = 0;
  let overdue = 0;
  let dueSoon = 0;
  let resolvedAwaitingApproval = 0;
  let closed = 0;

  for (const exceptionCase of allExceptions) {
    if (exceptionCase.status === "CLOSED") {
      closed += 1;
      continue;
    }
    if (exceptionCase.status === "RESOLVED") {
      resolvedAwaitingApproval += 1;
    }
    if (OPEN_STATUSES.has(exceptionCase.status)) {
      open += 1;
      if (!exceptionCase.assignedUserId) unassigned += 1;
    }

    const sla = calculateSlaState({ slaDeadline: exceptionCase.slaDeadline, closedAt: exceptionCase.closedAt, now });
    if (sla.state === "OVERDUE") overdue += 1;
    if (sla.state === "DUE_SOON") dueSoon += 1;
  }

  const uat = { pass: 0, fail: 0, blocked: 0, notRun: 0 };
  for (const group of uatGroups) {
    if (group.status === "PASS") uat.pass = group._count._all;
    if (group.status === "FAIL") uat.fail = group._count._all;
    if (group.status === "BLOCKED") uat.blocked = group._count._all;
    if (group.status === "NOT_RUN") uat.notRun = group._count._all;
  }

  return {
    totalPayments,
    totalSettlements,
    statusCounts,
    exceptions: { open, unassigned, overdue, dueSoon, resolvedAwaitingApproval, closed },
    latestReconciliationRun: latestRun
      ? {
          id: latestRun.id,
          runReference: latestRun.runReference,
          startedAt: latestRun.startedAt,
          status: latestRun.status,
          exceptionsCreated: latestRun.exceptionsCreated,
        }
      : null,
    uat,
  };
}
