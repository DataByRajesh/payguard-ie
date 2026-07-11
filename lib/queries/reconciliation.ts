import { prisma } from "@/lib/db";

export async function getLatestReconciliationRun() {
  return prisma.reconciliationRun.findFirst({ orderBy: { runAt: "desc" } });
}
