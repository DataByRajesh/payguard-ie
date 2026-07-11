import { prisma } from "@/lib/db";

export async function getLatestReconciliationRun() {
  return prisma.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" } });
}

export async function getReconciliationRuns() {
  return prisma.reconciliationRun.findMany({ orderBy: { startedAt: "desc" } });
}

export async function getReconciliationRunById(id: string) {
  return prisma.reconciliationRun.findUnique({
    where: { id },
    include: {
      results: {
        include: {
          payment: true,
          settlement: true,
          exceptionCase: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
