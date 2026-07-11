/*
  Warnings:

  - You are about to drop the column `notes` on the `ReconciliationResult` table. All the data in the column will be lost.
  - You are about to drop the column `outcome` on the `ReconciliationResult` table. All the data in the column will be lost.
  - You are about to drop the column `exceptionCount` on the `ReconciliationRun` table. All the data in the column will be lost.
  - You are about to drop the column `matchedCount` on the `ReconciliationRun` table. All the data in the column will be lost.
  - You are about to drop the column `runAt` on the `ReconciliationRun` table. All the data in the column will be lost.
  - Added the required column `dedupeKey` to the `ExceptionCase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passed` to the `ReconciliationResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ruleType` to the `ReconciliationResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `ReconciliationResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `countsByRule` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `countsBySeverity` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exceptionsCreated` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `failedCount` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passedCount` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalResults` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSettlements` to the `ReconciliationRun` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExceptionCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseReference" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "lastDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDeadline" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExceptionCase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExceptionCase" ("assignedTo", "caseReference", "createdAt", "description", "id", "openedAt", "paymentId", "resolvedAt", "severity", "status", "title", "type", "updatedAt") SELECT "assignedTo", "caseReference", "createdAt", "description", "id", "openedAt", "paymentId", "resolvedAt", "severity", "status", "title", "type", "updatedAt" FROM "ExceptionCase";
DROP TABLE "ExceptionCase";
ALTER TABLE "new_ExceptionCase" RENAME TO "ExceptionCase";
CREATE UNIQUE INDEX "ExceptionCase_caseReference_key" ON "ExceptionCase"("caseReference");
CREATE INDEX "ExceptionCase_dedupeKey_idx" ON "ExceptionCase"("dedupeKey");
CREATE TABLE "new_ReconciliationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reconciliationRunId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "settlementId" TEXT,
    "ruleType" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "severity" TEXT,
    "summary" TEXT NOT NULL,
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "differenceMinor" INTEGER,
    "metadata" TEXT,
    "exceptionCaseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReconciliationResult_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReconciliationResult_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReconciliationResult_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReconciliationResult_exceptionCaseId_fkey" FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReconciliationResult" ("createdAt", "id", "paymentId", "reconciliationRunId", "settlementId") SELECT "createdAt", "id", "paymentId", "reconciliationRunId", "settlementId" FROM "ReconciliationResult";
DROP TABLE "ReconciliationResult";
ALTER TABLE "new_ReconciliationResult" RENAME TO "ReconciliationResult";
CREATE INDEX "ReconciliationResult_paymentId_idx" ON "ReconciliationResult"("paymentId");
CREATE INDEX "ReconciliationResult_reconciliationRunId_idx" ON "ReconciliationResult"("reconciliationRunId");
CREATE INDEX "ReconciliationResult_exceptionCaseId_idx" ON "ReconciliationResult"("exceptionCaseId");
CREATE TABLE "new_ReconciliationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runReference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "totalPayments" INTEGER NOT NULL,
    "totalSettlements" INTEGER NOT NULL,
    "totalResults" INTEGER NOT NULL,
    "passedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "exceptionsCreated" INTEGER NOT NULL,
    "countsByRule" TEXT NOT NULL,
    "countsBySeverity" TEXT NOT NULL,
    "errorMessage" TEXT
);
INSERT INTO "new_ReconciliationRun" ("id", "runReference", "totalPayments") SELECT "id", "runReference", "totalPayments" FROM "ReconciliationRun";
DROP TABLE "ReconciliationRun";
ALTER TABLE "new_ReconciliationRun" RENAME TO "ReconciliationRun";
CREATE UNIQUE INDEX "ReconciliationRun_runReference_key" ON "ReconciliationRun"("runReference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
