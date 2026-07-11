import { prisma } from "@/lib/db";

export async function getRecentExceptionCases(limit = 10) {
  return prisma.exceptionCase.findMany({
    include: { payment: true },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}
