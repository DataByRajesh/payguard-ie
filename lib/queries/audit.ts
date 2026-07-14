import { prisma } from "@/lib/db";

export async function getAuditEventsForEntity(entityType: string, entityId: string) {
  return prisma.auditEvent.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
    include: { actorUser: true },
  });
}
