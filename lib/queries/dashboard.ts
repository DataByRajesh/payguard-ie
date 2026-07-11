import { prisma } from "@/lib/db";
import { PAYMENT_STATUS_PRESENTATION } from "@/lib/status";
import type { PaymentStatus } from "@/app/generated/prisma/client";

export interface DashboardSummary {
  totalPayments: number;
  totalSettlements: number;
  openExceptions: number;
  statusCounts: { status: PaymentStatus; label: string; count: number }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [totalPayments, totalSettlements, openExceptions, statusGroups] = await Promise.all([
    prisma.payment.count(),
    prisma.settlement.count(),
    prisma.exceptionCase.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts = statusGroups
    .map((group) => ({
      status: group.status,
      label: PAYMENT_STATUS_PRESENTATION[group.status].label,
      count: group._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return { totalPayments, totalSettlements, openExceptions, statusCounts };
}
