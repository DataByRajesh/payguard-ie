-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "actorUserId" TEXT,
ALTER COLUMN "actor" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
