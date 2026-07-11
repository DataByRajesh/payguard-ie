import { prisma } from "@/lib/db";
import type { ExceptionsQuery } from "@/lib/validation/exceptions";

export async function getRecentExceptionCases(limit = 10) {
  return prisma.exceptionCase.findMany({
    include: { payment: true },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

/**
 * SLA state ("breached"/"within") is derived from `slaDeadline` vs `now` at read time,
 * not stored, so it is filtered in-memory after the native (DB-level) filters — same
 * approach as the Payments page's derived settlement-status filter.
 */
export async function getExceptionCases(filters: ExceptionsQuery, now: Date = new Date()) {
  const cases = await prisma.exceptionCase.findMany({
    where: {
      type: filters.type,
      severity: filters.severity,
      status: filters.status,
      ...(filters.q
        ? {
            OR: [
              { caseReference: { contains: filters.q } },
              { payment: { paymentReference: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: { payment: { include: { settlement: true } } },
    orderBy: { openedAt: "desc" },
  });

  if (!filters.slaState) {
    return cases;
  }

  return cases.filter((exceptionCase) => {
    const breached = exceptionCase.slaDeadline !== null && exceptionCase.slaDeadline.getTime() < now.getTime();
    return filters.slaState === "BREACHED" ? breached : !breached;
  });
}

export async function getExceptionCaseById(id: string) {
  return prisma.exceptionCase.findUnique({
    where: { id },
    include: {
      payment: { include: { settlement: true, customer: true } },
      comments: { orderBy: { createdAt: "asc" } },
      evidenceRecords: true,
      reconciliationResults: { include: { reconciliationRun: true }, orderBy: { createdAt: "asc" } },
    },
  });
}
