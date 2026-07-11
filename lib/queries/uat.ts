import { prisma } from "@/lib/db";

export async function getUatTestCasesWithLatestExecution() {
  return prisma.uATTestCase.findMany({
    include: { executions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { testCaseRef: "asc" },
  });
}
