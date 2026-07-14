-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'DUPLICATE_PAYMENT', 'MISSING_SETTLEMENT', 'DELAYED_SETTLEMENT', 'SLA_BREACH', 'INVALID_STATUS_COMBINATION');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('NEW', 'ASSIGNED', 'INVESTIGATING', 'AWAITING_INFORMATION', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExceptionNoteType" AS ENUM ('INVESTIGATION', 'CUSTOMER_UPDATE', 'TECHNICAL_FINDING', 'HANDOVER', 'RESOLUTION_NOTE');

-- CreateEnum
CREATE TYPE "RootCauseCategory" AS ENUM ('PROCESSING_CONFIGURATION', 'SETTLEMENT_FILE_MISSING', 'UPSTREAM_PROVIDER_DELAY', 'DUPLICATE_SUBMISSION', 'DATA_MAPPING_ERROR', 'CURRENCY_CONFIGURATION', 'STATUS_SYNCHRONISATION', 'MANUAL_PROCESSING_ERROR', 'UNKNOWN', 'OTHER');

-- CreateEnum
CREATE TYPE "ResolutionAction" AS ENUM ('CORRECTIVE_SETTLEMENT_APPLIED', 'PAYMENT_STATUS_CORRECTED', 'DUPLICATE_TRANSACTION_CANCELLED', 'CONFIGURATION_CORRECTED', 'UPSTREAM_PROVIDER_CONFIRMED', 'ACCEPTED_OPERATIONAL_EXCEPTION', 'NO_ISSUE_FOUND', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationRuleType" AS ENUM ('MISSING_SETTLEMENT', 'AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'DUPLICATE_PAYMENT', 'DELAYED_SETTLEMENT', 'STUCK_PAYMENT', 'INVALID_STATUS_COMBINATION');

-- CreateEnum
CREATE TYPE "UATStatus" AS ENUM ('NOT_RUN', 'PASS', 'FAIL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('SCREENSHOT', 'LOG_EXTRACT', 'QUERY_RESULT', 'SIGN_OFF_DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expectedSettlementAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "settlementReference" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "SettlementStatus" NOT NULL,
    "settledAt" TIMESTAMP(3),
    "sourceFileReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "runReference" TEXT NOT NULL,
    "status" "ReconciliationRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalPayments" INTEGER NOT NULL,
    "totalSettlements" INTEGER NOT NULL,
    "totalResults" INTEGER NOT NULL,
    "passedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "exceptionsCreated" INTEGER NOT NULL,
    "countsByRule" TEXT NOT NULL,
    "countsBySeverity" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationResult" (
    "id" TEXT NOT NULL,
    "reconciliationRunId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "settlementId" TEXT,
    "ruleType" "ReconciliationRuleType" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "severity" "ExceptionSeverity",
    "summary" TEXT NOT NULL,
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "differenceMinor" INTEGER,
    "metadata" TEXT,
    "exceptionCaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionCase" (
    "id" TEXT NOT NULL,
    "caseReference" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "status" "ExceptionStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedByUserId" TEXT,
    "assignmentNote" TEXT,
    "rootCauseCategory" "RootCauseCategory",
    "rootCauseSummary" TEXT,
    "rootCauseIdentifiedById" TEXT,
    "rootCauseIdentifiedAt" TIMESTAMP(3),
    "resolutionAction" "ResolutionAction",
    "resolutionSummary" TEXT,
    "resolutionUserId" TEXT,
    "resolutionAt" TIMESTAMP(3),
    "approvalDecision" "ApprovalDecision",
    "approvalNote" TEXT,
    "approverUserId" TEXT,
    "approvalAt" TIMESTAMP(3),
    "dedupeKey" TEXT NOT NULL,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDeadline" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExceptionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionComment" (
    "id" TEXT NOT NULL,
    "exceptionCaseId" TEXT NOT NULL,
    "noteType" "ExceptionNoteType" NOT NULL DEFAULT 'INVESTIGATION',
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExceptionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UATTestCase" (
    "id" TEXT NOT NULL,
    "testCaseRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirementReference" TEXT,
    "preconditions" TEXT,
    "steps" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UATTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UATExecution" (
    "id" TEXT NOT NULL,
    "uatTestCaseId" TEXT NOT NULL,
    "status" "UATStatus" NOT NULL,
    "executedAt" TIMESTAMP(3),
    "testerUserId" TEXT,
    "actualResult" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedExceptionCaseId" TEXT,

    CONSTRAINT "UATExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileReference" TEXT,
    "addedByUserId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uatExecutionId" TEXT,
    "exceptionCaseId" TEXT,

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerRef_key" ON "Customer"("customerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentReference_key" ON "Payment"("paymentReference");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_settlementReference_key" ON "Settlement"("settlementReference");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_paymentId_key" ON "Settlement"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationRun_runReference_key" ON "ReconciliationRun"("runReference");

-- CreateIndex
CREATE INDEX "ReconciliationResult_paymentId_idx" ON "ReconciliationResult"("paymentId");

-- CreateIndex
CREATE INDEX "ReconciliationResult_reconciliationRunId_idx" ON "ReconciliationResult"("reconciliationRunId");

-- CreateIndex
CREATE INDEX "ReconciliationResult_exceptionCaseId_idx" ON "ReconciliationResult"("exceptionCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ExceptionCase_caseReference_key" ON "ExceptionCase"("caseReference");

-- CreateIndex
CREATE INDEX "ExceptionCase_dedupeKey_idx" ON "ExceptionCase"("dedupeKey");

-- CreateIndex
CREATE INDEX "ExceptionCase_status_idx" ON "ExceptionCase"("status");

-- CreateIndex
CREATE INDEX "ExceptionCase_assignedUserId_idx" ON "ExceptionCase"("assignedUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "UATTestCase_testCaseRef_key" ON "UATTestCase"("testCaseRef");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceRecord_evidenceRef_key" ON "EvidenceRecord"("evidenceRef");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationResult" ADD CONSTRAINT "ReconciliationResult_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationResult" ADD CONSTRAINT "ReconciliationResult_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationResult" ADD CONSTRAINT "ReconciliationResult_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationResult" ADD CONSTRAINT "ReconciliationResult_exceptionCaseId_fkey" FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionCase" ADD CONSTRAINT "ExceptionCase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionCase" ADD CONSTRAINT "ExceptionCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionCase" ADD CONSTRAINT "ExceptionCase_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionCase" ADD CONSTRAINT "ExceptionCase_rootCauseIdentifiedById_fkey" FOREIGN KEY ("rootCauseIdentifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionCase" ADD CONSTRAINT "ExceptionCase_resolutionUserId_fkey" FOREIGN KEY ("resolutionUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionCase" ADD CONSTRAINT "ExceptionCase_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionComment" ADD CONSTRAINT "ExceptionComment_exceptionCaseId_fkey" FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionComment" ADD CONSTRAINT "ExceptionComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATExecution" ADD CONSTRAINT "UATExecution_uatTestCaseId_fkey" FOREIGN KEY ("uatTestCaseId") REFERENCES "UATTestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATExecution" ADD CONSTRAINT "UATExecution_testerUserId_fkey" FOREIGN KEY ("testerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UATExecution" ADD CONSTRAINT "UATExecution_linkedExceptionCaseId_fkey" FOREIGN KEY ("linkedExceptionCaseId") REFERENCES "ExceptionCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_uatExecutionId_fkey" FOREIGN KEY ("uatExecutionId") REFERENCES "UATExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_exceptionCaseId_fkey" FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
