import { prisma } from "@/lib/db";

export async function getUatTestCasesWithLatestExecution() {
  return prisma.uATTestCase.findMany({
    include: { executions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { testCaseRef: "asc" },
  });
}

export interface UatSummary {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  notRun: number;
}

export async function getUatSummary(): Promise<UatSummary> {
  const groups = await prisma.uATExecution.groupBy({ by: ["status"], _count: { _all: true } });
  const summary: UatSummary = { total: 0, pass: 0, fail: 0, blocked: 0, notRun: 0 };
  for (const group of groups) {
    summary.total += group._count._all;
    if (group.status === "PASS") summary.pass = group._count._all;
    if (group.status === "FAIL") summary.fail = group._count._all;
    if (group.status === "BLOCKED") summary.blocked = group._count._all;
    if (group.status === "NOT_RUN") summary.notRun = group._count._all;
  }
  return summary;
}

export async function getUatTestCaseById(id: string) {
  return prisma.uATTestCase.findUnique({
    where: { id },
    include: {
      executions: {
        include: {
          testerUser: true,
          linkedExceptionCase: true,
          evidenceRecords: { include: { addedByUser: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/** Open (not closed) exception cases, for the manual UAT-failure-to-exception linking dropdown. */
export async function getLinkableExceptionCases() {
  return prisma.exceptionCase.findMany({
    where: { status: { not: "CLOSED" } },
    select: { id: true, caseReference: true, title: true },
    orderBy: { caseReference: "asc" },
  });
}
