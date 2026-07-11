import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatMinorUnits } from "@/lib/money";
import { calculateSlaState } from "@/lib/exception-workflow/sla";
import { computeReleaseRecommendation } from "@/lib/exception-workflow/uatRecommendation";
import { getExceptionQueueSummary } from "@/lib/queries/exceptions";
import { getUatSummary } from "@/lib/queries/uat";
import type { SupportedCurrency } from "@/lib/constants";
import type { ReportTable, ReportType } from "./types";

async function getReconciliationReport(now: Date): Promise<ReportTable> {
  const runs = await prisma.reconciliationRun.findMany({ orderBy: { startedAt: "desc" } });
  const totalExceptionsCreated = runs.reduce((sum, run) => sum + run.exceptionsCreated, 0);

  return {
    title: "Reconciliation Run Summary",
    description: "Every reconciliation run executed against this environment's payment/settlement data.",
    generatedAt: now,
    summary: [
      { label: "Total runs", value: String(runs.length) },
      { label: "Latest run status", value: runs[0]?.status ?? "—" },
      { label: "Total exceptions created", value: String(totalExceptionsCreated) },
    ],
    columns: ["Run reference", "Started", "Status", "Payments", "Passed", "Failed", "Exceptions created"],
    rows: runs.map((run) => [
      run.runReference,
      formatDateTime(run.startedAt),
      run.status,
      String(run.totalPayments),
      String(run.passedCount),
      String(run.failedCount),
      String(run.exceptionsCreated),
    ]),
  };
}

async function getExceptionsReport(now: Date): Promise<ReportTable> {
  const [summary, cases] = await Promise.all([
    getExceptionQueueSummary(now),
    prisma.exceptionCase.findMany({
      include: { assignedUser: true, payment: true },
      orderBy: { openedAt: "desc" },
    }),
  ]);

  return {
    title: "Exception Queue Report",
    description: "Every exception case, its current status, ownership and SLA state.",
    generatedAt: now,
    summary: [
      { label: "Open", value: String(summary.open) },
      { label: "Unassigned", value: String(summary.unassigned) },
      { label: "Overdue", value: String(summary.overdue) },
      { label: "Due soon", value: String(summary.dueSoon) },
      { label: "Awaiting approval", value: String(summary.resolvedAwaitingApproval) },
      { label: "Closed", value: String(summary.closed) },
    ],
    columns: ["Case reference", "Type", "Severity", "Status", "Owner", "SLA state", "Payment reference", "Opened"],
    rows: cases.map((exceptionCase) => {
      const sla = calculateSlaState({ slaDeadline: exceptionCase.slaDeadline, closedAt: exceptionCase.closedAt, now });
      return [
        exceptionCase.caseReference,
        exceptionCase.type,
        exceptionCase.severity,
        exceptionCase.status,
        exceptionCase.assignedUser?.name ?? "Unassigned",
        sla.state,
        exceptionCase.payment.paymentReference,
        formatDate(exceptionCase.openedAt),
      ];
    }),
  };
}

async function getUatReport(now: Date): Promise<ReportTable> {
  const [summary, testCases] = await Promise.all([
    getUatSummary(),
    prisma.uATTestCase.findMany({
      include: { executions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { testCaseRef: "asc" },
    }),
  ]);
  const recommendation = computeReleaseRecommendation(summary);

  return {
    title: "UAT Summary Report",
    description: "Latest execution result for every UAT test case, and an overall release recommendation.",
    generatedAt: now,
    summary: [
      { label: "Test cases", value: String(testCases.length) },
      { label: "Pass", value: String(summary.pass) },
      { label: "Fail", value: String(summary.fail) },
      { label: "Blocked", value: String(summary.blocked) },
      { label: "Not run", value: String(summary.notRun) },
      { label: "Release recommendation", value: recommendation },
    ],
    columns: ["Test case", "Area", "Requirement", "Latest result", "Last executed"],
    rows: testCases.map((testCase) => [
      `${testCase.testCaseRef} — ${testCase.title}`,
      testCase.area,
      testCase.requirementReference ?? "—",
      testCase.executions[0]?.status ?? "NOT_RUN",
      testCase.executions[0]?.executedAt ? formatDateTime(testCase.executions[0].executedAt) : "Never",
    ]),
  };
}

async function getPaymentsReport(now: Date): Promise<ReportTable> {
  const payments = await prisma.payment.findMany({
    include: { customer: true, settlement: true },
    orderBy: { createdAt: "desc" },
  });
  const totalSettled = payments.filter((payment) => payment.settlement?.status === "SETTLED").length;

  return {
    title: "Payments & Settlements Summary",
    description: "Every payment in this environment, its settlement status and amount.",
    generatedAt: now,
    summary: [
      { label: "Total payments", value: String(payments.length) },
      { label: "Settled", value: String(totalSettled) },
      { label: "Awaiting settlement", value: String(payments.filter((payment) => !payment.settlement).length) },
    ],
    columns: ["Payment reference", "Customer", "Amount", "Currency", "Method", "Status", "Settlement status", "Created"],
    rows: payments.map((payment) => [
      payment.paymentReference,
      payment.customer.displayName,
      formatMinorUnits(payment.amountMinor, payment.currency as SupportedCurrency),
      payment.currency,
      payment.paymentMethod,
      payment.status,
      payment.settlement?.status ?? "NONE",
      formatDate(payment.createdAt),
    ]),
  };
}

export async function getReportData(type: ReportType, now: Date = new Date()): Promise<ReportTable> {
  switch (type) {
    case "reconciliation":
      return getReconciliationReport(now);
    case "exceptions":
      return getExceptionsReport(now);
    case "uat":
      return getUatReport(now);
    case "payments":
      return getPaymentsReport(now);
  }
}
