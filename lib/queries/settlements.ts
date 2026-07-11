import { prisma } from "@/lib/db";
import type { SettlementsQuery } from "@/lib/validation/settlements";
import type { SettlementListItem } from "@/lib/types";

export async function getSettlements(filters: SettlementsQuery): Promise<SettlementListItem[]> {
  return prisma.settlement.findMany({
    where: {
      status: filters.status,
      currency: filters.currency,
      ...(filters.q
        ? {
            OR: [
              { settlementReference: { contains: filters.q } },
              { payment: { paymentReference: { contains: filters.q } } },
              { payment: { customer: { customerRef: { contains: filters.q } } } },
              { payment: { customer: { displayName: { contains: filters.q } } } },
            ],
          }
        : {}),
    },
    include: { payment: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
}
