-- DropForeignKey
ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_actorUserId_fkey";

-- AlterTable
ALTER TABLE "AuditEvent" DROP COLUMN "actor",
ALTER COLUMN "actorUserId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
