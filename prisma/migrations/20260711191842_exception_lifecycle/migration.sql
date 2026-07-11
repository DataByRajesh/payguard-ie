/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `ExceptionCase` table. All the data in the column will be lost.
  - You are about to drop the column `author` on the `ExceptionComment` table. All the data in the column will be lost.
  - You are about to drop the column `executedBy` on the `UATExecution` table. All the data in the column will be lost.
  - Added the required column `authorUserId` to the `ExceptionComment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UATTestCase" ADD COLUMN "requirementReference" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EvidenceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceRef" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileReference" TEXT,
    "addedByUserId" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uatExecutionId" TEXT,
    "exceptionCaseId" TEXT,
    CONSTRAINT "EvidenceRecord_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EvidenceRecord_uatExecutionId_fkey" FOREIGN KEY ("uatExecutionId") REFERENCES "UATExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EvidenceRecord_exceptionCaseId_fkey" FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EvidenceRecord" ("capturedAt", "createdAt", "description", "evidenceRef", "exceptionCaseId", "fileReference", "id", "title", "type", "uatExecutionId") SELECT "capturedAt", "createdAt", "description", "evidenceRef", "exceptionCaseId", "fileReference", "id", "title", "type", "uatExecutionId" FROM "EvidenceRecord";
DROP TABLE "EvidenceRecord";
ALTER TABLE "new_EvidenceRecord" RENAME TO "EvidenceRecord";
CREATE UNIQUE INDEX "EvidenceRecord_evidenceRef_key" ON "EvidenceRecord"("evidenceRef");
CREATE TABLE "new_ExceptionCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseReference" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "assignedAt" DATETIME,
    "assignedByUserId" TEXT,
    "assignmentNote" TEXT,
    "rootCauseCategory" TEXT,
    "rootCauseSummary" TEXT,
    "rootCauseIdentifiedById" TEXT,
    "rootCauseIdentifiedAt" DATETIME,
    "resolutionAction" TEXT,
    "resolutionSummary" TEXT,
    "resolutionUserId" TEXT,
    "resolutionAt" DATETIME,
    "approvalDecision" TEXT,
    "approvalNote" TEXT,
    "approverUserId" TEXT,
    "approvalAt" DATETIME,
    "dedupeKey" TEXT NOT NULL,
    "lastDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDeadline" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "closedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExceptionCase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExceptionCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionCase_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionCase_rootCauseIdentifiedById_fkey" FOREIGN KEY ("rootCauseIdentifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionCase_resolutionUserId_fkey" FOREIGN KEY ("resolutionUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionCase_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExceptionCase" ("caseReference", "createdAt", "dedupeKey", "description", "id", "lastDetectedAt", "openedAt", "paymentId", "resolvedAt", "severity", "slaDeadline", "source", "status", "title", "type", "updatedAt") SELECT "caseReference", "createdAt", "dedupeKey", "description", "id", "lastDetectedAt", "openedAt", "paymentId", "resolvedAt", "severity", "slaDeadline", "source", "status", "title", "type", "updatedAt" FROM "ExceptionCase";
DROP TABLE "ExceptionCase";
ALTER TABLE "new_ExceptionCase" RENAME TO "ExceptionCase";
CREATE UNIQUE INDEX "ExceptionCase_caseReference_key" ON "ExceptionCase"("caseReference");
CREATE INDEX "ExceptionCase_dedupeKey_idx" ON "ExceptionCase"("dedupeKey");
CREATE INDEX "ExceptionCase_status_idx" ON "ExceptionCase"("status");
CREATE INDEX "ExceptionCase_assignedUserId_idx" ON "ExceptionCase"("assignedUserId");
CREATE TABLE "new_ExceptionComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exceptionCaseId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'INVESTIGATION',
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExceptionComment_exceptionCaseId_fkey" FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExceptionComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExceptionComment" ("body", "createdAt", "exceptionCaseId", "id") SELECT "body", "createdAt", "exceptionCaseId", "id" FROM "ExceptionComment";
DROP TABLE "ExceptionComment";
ALTER TABLE "new_ExceptionComment" RENAME TO "ExceptionComment";
CREATE TABLE "new_UATExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uatTestCaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executedAt" DATETIME,
    "testerUserId" TEXT,
    "actualResult" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedExceptionCaseId" TEXT,
    CONSTRAINT "UATExecution_uatTestCaseId_fkey" FOREIGN KEY ("uatTestCaseId") REFERENCES "UATTestCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UATExecution_testerUserId_fkey" FOREIGN KEY ("testerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UATExecution_linkedExceptionCaseId_fkey" FOREIGN KEY ("linkedExceptionCaseId") REFERENCES "ExceptionCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UATExecution" ("actualResult", "createdAt", "executedAt", "id", "notes", "status", "uatTestCaseId") SELECT "actualResult", "createdAt", "executedAt", "id", "notes", "status", "uatTestCaseId" FROM "UATExecution";
DROP TABLE "UATExecution";
ALTER TABLE "new_UATExecution" RENAME TO "UATExecution";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "role") SELECT "createdAt", "email", "id", "name", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
