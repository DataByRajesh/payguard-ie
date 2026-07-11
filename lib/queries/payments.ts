import { prisma } from "@/lib/db";
import { deriveSettlementDisplayStatus } from "@/lib/reconciliation";
import type { PaymentsQuery } from "@/lib/validation/payments";
import type { PaymentListItem } from "@/lib/types";

/**
 * Fetches payments applying native (DB-level) filters, then applies the derived
 * settlement-status filter in-memory. At Sprint 1 scale (~50 rows) this is simpler
 * and always-correct; revisit if the dataset grows large enough for it to matter.
 */
export async function getPayments(filters: PaymentsQuery): Promise<PaymentListItem[]> {
  const payments = await prisma.payment.findMany({
    where: {
      status: filters.status,
      currency: filters.currency,
      ...(filters.q
        ? {
            OR: [
              { paymentReference: { contains: filters.q } },
              { customer: { customerRef: { contains: filters.q } } },
              { customer: { displayName: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: { customer: true, settlement: true },
    orderBy: { createdAt: "desc" },
  });

  const withDisplayStatus: PaymentListItem[] = payments.map((payment) => ({
    ...payment,
    settlementDisplayStatus: deriveSettlementDisplayStatus(payment, payment.settlement),
  }));

  if (!filters.settlementStatus) {
    return withDisplayStatus;
  }

  return withDisplayStatus.filter((payment) => payment.settlementDisplayStatus === filters.settlementStatus);
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      settlement: true,
      exceptionCases: {
        include: { comments: true, evidenceRecords: true },
        orderBy: { openedAt: "desc" },
      },
      reconciliationResults: {
        include: { reconciliationRun: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!payment) return null;

  return {
    ...payment,
    settlementDisplayStatus: deriveSettlementDisplayStatus(payment, payment.settlement),
  };
}
