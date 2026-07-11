import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Customer, type Payment, type PaymentStatus, type Settlement, type SettlementStatus } from "../app/generated/prisma/client";
import { runReconciliation } from "../lib/reconciliation-engine/service";
import {
  createRng,
  pick,
  randomInt,
  hoursAgo,
  hoursFromNow,
  daysAgo,
  IE_FIRST_NAMES,
  GB_FIRST_NAMES,
  SURNAMES,
  BUSINESS_NAMES,
  makeCustomerRef,
  makeReference,
} from "./seed-helpers";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });
const rng = createRng(42);
const now = new Date();
const MS_PER_DAY_LOCAL = 24 * 60 * 60 * 1000;

let paymentSeq = 1;
let settlementSeq = 1;
let evidenceSeq = 1;

type Currency = "EUR" | "GBP";
const EUR_METHODS = ["SEPA_CREDIT_TRANSFER", "SEPA_DIRECT_DEBIT", "CARD"] as const;
const GBP_METHODS = ["FASTER_PAYMENTS", "CARD", "SWIFT"] as const;
type PaymentMethodValue = (typeof EUR_METHODS)[number] | (typeof GBP_METHODS)[number];

const createdPayments: { payment: Payment; settlement: Settlement | null }[] = [];

async function createPayment(params: {
  customer: Customer;
  currency: Currency;
  amountMinor: number;
  status: PaymentStatus;
  createdAt: Date;
  expectedSettlementAt: Date;
  method?: PaymentMethodValue;
}): Promise<Payment> {
  const methods = params.currency === "EUR" ? EUR_METHODS : GBP_METHODS;
  const payment = await prisma.payment.create({
    data: {
      paymentReference: makeReference("PAY", paymentSeq++),
      customerId: params.customer.id,
      amountMinor: params.amountMinor,
      currency: params.currency,
      paymentMethod: params.method ?? pick(rng, methods),
      status: params.status,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
      expectedSettlementAt: params.expectedSettlementAt,
    },
  });
  createdPayments.push({ payment, settlement: null });
  return payment;
}

async function createSettlement(
  payment: Payment,
  params: { amountMinor: number; currency: string; status: SettlementStatus; settledAt: Date | null },
): Promise<Settlement> {
  const settlement = await prisma.settlement.create({
    data: {
      settlementReference: makeReference("STL", settlementSeq++),
      paymentId: payment.id,
      amountMinor: params.amountMinor,
      currency: params.currency,
      status: params.status,
      settledAt: params.settledAt,
      sourceFileReference: `SETTLEMENT-FILE-${params.currency}-${(params.settledAt ?? payment.createdAt)
        .toISOString()
        .slice(0, 10)}.csv`,
    },
  });
  const entry = createdPayments.find((p) => p.payment.id === payment.id);
  if (entry) entry.settlement = settlement;
  return settlement;
}

async function createAuditEvent(
  entityType: string,
  entityId: string,
  action: string,
  summary: string,
  actor: string,
  createdAt: Date,
) {
  await prisma.auditEvent.create({ data: { entityType, entityId, action, summary, actor, createdAt } });
}

async function main() {
  console.log("Seeding PayGuard IE...");

  // 1. Clean slate, reverse dependency order (idempotent re-seeding).
  await prisma.evidenceRecord.deleteMany();
  await prisma.uATExecution.deleteMany();
  await prisma.uATTestCase.deleteMany();
  await prisma.exceptionComment.deleteMany();
  await prisma.exceptionCase.deleteMany();
  await prisma.reconciliationResult.deleteMany();
  await prisma.reconciliationRun.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Users
  const userDefs = [
    { name: "Aisling Byrne", role: "OPS_ANALYST" },
    { name: "Conor Walsh", role: "OPS_ANALYST" },
    { name: "Sophie Bennett", role: "OPS_ANALYST" },
    { name: "Emma Whittaker", role: "APP_SUPPORT" },
    { name: "James Carter", role: "APP_SUPPORT" },
    { name: "Liam Foley", role: "APP_SUPPORT" },
    { name: "Niamh Doyle", role: "UAT_LEAD" },
    { name: "Chloe Fitzgerald", role: "UAT_LEAD" },
    { name: "Ryan O'Brien", role: "ADMIN" },
  ] as const;

  const users = [];
  for (const def of userDefs) {
    const email = `${def.name.toLowerCase().replace(/[^a-z]+/g, ".")}@payguard-ie.example`;
    users.push(await prisma.user.create({ data: { email, name: def.name, role: def.role } }));
  }
  const opsAnalysts = users.filter((u) => u.role === "OPS_ANALYST");
  const uatLeads = users.filter((u) => u.role === "UAT_LEAD");
  const appSupport = users.filter((u) => u.role === "APP_SUPPORT");

  // 3. Customers — 12 Irish (EUR-biased), 12 British (GBP-biased); 1 in 4 are businesses.
  const customers: Customer[] = [];
  let customerSeq = 1;
  for (const country of ["IE", "GB"] as const) {
    const firstNames = country === "IE" ? IE_FIRST_NAMES : GB_FIRST_NAMES;
    for (let i = 0; i < 12; i++) {
      const isBusiness = i % 4 === 3;
      const displayName = isBusiness ? pick(rng, BUSINESS_NAMES) : `${pick(rng, firstNames)} ${pick(rng, SURNAMES)}`;
      customers.push(
        await prisma.customer.create({
          data: { customerRef: makeCustomerRef(rng, country, customerSeq), displayName, country },
        }),
      );
      customerSeq++;
    }
  }
  const ieCustomers = customers.filter((c) => c.country === "IE");
  const gbCustomers = customers.filter((c) => c.country === "GB");

  function nextCustomer(index: number): Customer {
    const pool = index % 2 === 0 ? ieCustomers : gbCustomers;
    return pool[index % pool.length];
  }
  function currencyFor(customer: Customer): Currency {
    return customer.country === "IE" ? "EUR" : "GBP";
  }

  // Payment ids per scenario, so we can annotate the engine-created exceptions afterwards.
  const scenarioPaymentIds: Record<
    "missingSettlement" | "amountMismatch" | "currencyMismatch" | "duplicate" | "delayedSettlement" | "stuckPayment" | "invalidStatusCombination",
    string[]
  > = {
    missingSettlement: [],
    amountMismatch: [],
    currencyMismatch: [],
    duplicate: [],
    delayedSettlement: [],
    stuckPayment: [],
    invalidStatusCombination: [],
  };

  // 4a. Bucket A — happy path: successful payment with matching / correctly settled settlement (15).
  for (let i = 0; i < 15; i++) {
    const customer = nextCustomer(i);
    const currency = currencyFor(customer);
    const amountMinor = randomInt(rng, 2500, 250000);
    const createdAt = daysAgo(randomInt(rng, 3, 20), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor, status: "COMPLETED", createdAt, expectedSettlementAt });
    const settledAt = hoursAgo(randomInt(rng, 1, 6), expectedSettlementAt);
    await createSettlement(payment, { amountMinor, currency, status: "SETTLED", settledAt });
    await createAuditEvent("PAYMENT", payment.id, "PAYMENT_CREATED", "Payment received and queued for settlement.", pick(rng, opsAnalysts).name, createdAt);
    await createAuditEvent("PAYMENT", payment.id, "SETTLEMENT_MATCHED", "Settlement file matched payment with no discrepancies.", "SYSTEM", settledAt);
  }

  // 4b. Bucket B — completed, no settlement (4): 2 recent (still within SLA at seed time), 2 past SLA
  // (the reconciliation engine's missing-settlement rule detects these live — no manual exception needed).
  for (let i = 0; i < 2; i++) {
    const customer = nextCustomer(i + 15);
    const currency = currencyFor(customer);
    const createdAt = hoursAgo(randomInt(rng, 6, 36), now);
    // Relative to `now` (not createdAt) so this reliably stays within SLA regardless of the createdAt draw.
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 12, 48), now);
    await createPayment({ customer, currency, amountMinor: randomInt(rng, 3000, 150000), status: "COMPLETED", createdAt, expectedSettlementAt });
  }
  for (let i = 0; i < 2; i++) {
    const customer = nextCustomer(i + 17);
    const currency = currencyFor(customer);
    const createdAt = daysAgo(randomInt(rng, 10, 15), now);
    const expectedSettlementAt = daysAgo(randomInt(rng, 2, 5), now);
    const payment = await createPayment({ customer, currency, amountMinor: randomInt(rng, 3000, 150000), status: "COMPLETED", createdAt, expectedSettlementAt });
    scenarioPaymentIds.missingSettlement.push(payment.id);
  }

  // 4c. Bucket C — amount mismatch (5).
  for (let i = 0; i < 5; i++) {
    const customer = nextCustomer(i + 19);
    const currency = currencyFor(customer);
    const amountMinor = randomInt(rng, 5000, 200000);
    const createdAt = daysAgo(randomInt(rng, 4, 15), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor, status: "COMPLETED", createdAt, expectedSettlementAt });
    const deltaMinor = randomInt(rng, 500, 8000) * (rng() > 0.5 ? 1 : -1);
    const settledAmountMinor = amountMinor + deltaMinor;
    await createSettlement(payment, { amountMinor: settledAmountMinor, currency, status: "SETTLED", settledAt: hoursAgo(randomInt(rng, 1, 6), expectedSettlementAt) });
    scenarioPaymentIds.amountMismatch.push(payment.id);
  }

  // 4d. Bucket D — currency mismatch (4).
  for (let i = 0; i < 4; i++) {
    const customer = nextCustomer(i + 24);
    const currency = currencyFor(customer);
    const otherCurrency: Currency = currency === "EUR" ? "GBP" : "EUR";
    const amountMinor = randomInt(rng, 5000, 200000);
    const createdAt = daysAgo(randomInt(rng, 4, 15), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor, status: "COMPLETED", createdAt, expectedSettlementAt });
    await createSettlement(payment, { amountMinor, currency: otherCurrency, status: "SETTLED", settledAt: hoursAgo(randomInt(rng, 1, 6), expectedSettlementAt) });
    scenarioPaymentIds.currencyMismatch.push(payment.id);
  }

  // 4e. Bucket E — duplicate payment (3 pairs, 6 payments). The pair shares customer, amount,
  // currency AND payment method so the engine's fingerprint-based duplicate rule detects it.
  for (let i = 0; i < 3; i++) {
    const customer = nextCustomer(i + 28);
    const currency = currencyFor(customer);
    const method = pick(rng, currency === "EUR" ? EUR_METHODS : GBP_METHODS);
    const amountMinor = randomInt(rng, 5000, 150000);
    const createdAt = daysAgo(randomInt(rng, 5, 12), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const original = await createPayment({ customer, currency, amountMinor, status: "COMPLETED", createdAt, expectedSettlementAt, method });
    await createSettlement(original, { amountMinor, currency, status: "SETTLED", settledAt: hoursAgo(randomInt(rng, 1, 6), expectedSettlementAt) });

    const duplicateCreatedAt = hoursFromNow(randomInt(rng, 1, 3), createdAt);
    const duplicate = await createPayment({
      customer,
      currency,
      amountMinor,
      status: "COMPLETED",
      createdAt: duplicateCreatedAt,
      expectedSettlementAt: hoursFromNow(randomInt(rng, 24, 48), duplicateCreatedAt),
      method,
    });
    scenarioPaymentIds.duplicate.push(duplicate.id);
  }

  // 4f. Bucket F — delayed settlement (5).
  for (let i = 0; i < 5; i++) {
    const customer = nextCustomer(i + 31);
    const currency = currencyFor(customer);
    const amountMinor = randomInt(rng, 5000, 200000);
    const createdAt = daysAgo(randomInt(rng, 8, 20), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor, status: "COMPLETED", createdAt, expectedSettlementAt });
    const lateSettledAt = new Date(expectedSettlementAt.getTime() + randomInt(rng, 1, 5) * MS_PER_DAY_LOCAL);
    await createSettlement(payment, { amountMinor, currency, status: "SETTLED", settledAt: lateSettledAt });
    scenarioPaymentIds.delayedSettlement.push(payment.id);
  }

  // 4g. Bucket G — pending, beyond SLA (4).
  for (let i = 0; i < 4; i++) {
    const customer = nextCustomer(i + 36);
    const currency = currencyFor(customer);
    const createdAt = daysAgo(randomInt(rng, 10, 20), now);
    const expectedSettlementAt = daysAgo(randomInt(rng, 1, 6), now);
    const payment = await createPayment({ customer, currency, amountMinor: randomInt(rng, 3000, 180000), status: "PENDING", createdAt, expectedSettlementAt });
    scenarioPaymentIds.stuckPayment.push(payment.id);
  }

  // 4h. Bucket H — failed payment (5). No settlement: failed payments never reach settlement processing.
  for (let i = 0; i < 5; i++) {
    const customer = nextCustomer(i + 40);
    const currency = currencyFor(customer);
    const createdAt = daysAgo(randomInt(rng, 1, 10), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor: randomInt(rng, 2000, 120000), status: "FAILED", createdAt, expectedSettlementAt });
    await createAuditEvent("PAYMENT", payment.id, "PAYMENT_FAILED", "Payment processing failed at the acquirer.", "SYSTEM", createdAt);
  }

  // 4i. Bucket I — invalid payment/settlement status combination (2). The only rule with no
  // other natural source bucket: a FAILED and a REVERSED ("cancelled") payment that each still
  // have a SETTLED settlement on file, which should never happen in a healthy lifecycle.
  {
    const customer = nextCustomer(45);
    const currency = currencyFor(customer);
    const amountMinor = randomInt(rng, 5000, 150000);
    const createdAt = daysAgo(randomInt(rng, 3, 10), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor, status: "FAILED", createdAt, expectedSettlementAt });
    await createSettlement(payment, { amountMinor, currency, status: "SETTLED", settledAt: hoursAgo(randomInt(rng, 1, 6), expectedSettlementAt) });
    scenarioPaymentIds.invalidStatusCombination.push(payment.id);
  }
  {
    const customer = nextCustomer(46);
    const currency = currencyFor(customer);
    const amountMinor = randomInt(rng, 5000, 150000);
    const createdAt = daysAgo(randomInt(rng, 3, 10), now);
    const expectedSettlementAt = hoursFromNow(randomInt(rng, 24, 48), createdAt);
    const payment = await createPayment({ customer, currency, amountMinor, status: "REVERSED", createdAt, expectedSettlementAt });
    await createSettlement(payment, { amountMinor, currency, status: "SETTLED", settledAt: hoursAgo(randomInt(rng, 1, 6), expectedSettlementAt) });
    scenarioPaymentIds.invalidStatusCombination.push(payment.id);
  }

  console.log(`Created ${createdPayments.length} payments.`);

  // 5. Run the real deterministic reconciliation engine. This is what generates the
  // ReconciliationRun, ReconciliationResult and ExceptionCase rows now — replacing Sprint 1's
  // hand-authored exception seeding — so seed data and engine behaviour can never disagree.
  const runResult = await runReconciliation(now);
  console.log(
    `Reconciliation run ${runResult.runReference}: ${runResult.summary.passedCount} passed, ${runResult.summary.failedCount} failed, ${runResult.summary.exceptionsCreated} exceptions created.`,
  );

  // 6. Annotate a subset of the engine-created exceptions with investigation comments/evidence
  // and advance a few statuses, purely for UI variety in this seed snapshot.
  async function annotateException(
    paymentId: string,
    opts: { comments: { author: string; body: string }[]; withEvidence?: boolean; status?: "IN_PROGRESS" | "RESOLVED" },
  ) {
    const exceptionCase = await prisma.exceptionCase.findFirst({ where: { paymentId }, orderBy: { createdAt: "asc" } });
    if (!exceptionCase) return;

    for (const comment of opts.comments) {
      await prisma.exceptionComment.create({
        data: { exceptionCaseId: exceptionCase.id, author: comment.author, body: comment.body },
      });
    }

    if (opts.withEvidence) {
      await prisma.evidenceRecord.create({
        data: {
          evidenceRef: makeReference("EVD", evidenceSeq++),
          type: "LOG_EXTRACT",
          title: `Investigation log — ${exceptionCase.caseReference}`,
          description: "Transaction log extract supporting the exception investigation.",
          fileReference: `/evidence/${exceptionCase.caseReference.toLowerCase()}.log`,
          exceptionCaseId: exceptionCase.id,
        },
      });
    }

    if (opts.status) {
      await prisma.exceptionCase.update({
        where: { id: exceptionCase.id },
        data: { status: opts.status, resolvedAt: opts.status === "RESOLVED" ? new Date() : null },
      });
    }
  }

  for (const paymentId of scenarioPaymentIds.missingSettlement) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Checked latest settlement batch — no matching reference found. Escalating to scheme operations." }],
      withEvidence: true,
      status: "IN_PROGRESS",
    });
  }
  for (const paymentId of scenarioPaymentIds.amountMismatch) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Confirmed discrepancy against source settlement file. Requesting correction from scheme." }],
      withEvidence: true,
    });
  }
  for (const paymentId of scenarioPaymentIds.currencyMismatch) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Likely a file-processing error at the settlement provider — raised with their support desk." }],
    });
  }
  for (const paymentId of scenarioPaymentIds.duplicate) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Confirmed with customer service — customer confirms only one purchase was intended. Reversal requested." }],
      withEvidence: true,
    });
  }
  for (const [index, paymentId] of scenarioPaymentIds.delayedSettlement.entries()) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Settlement has now been received; monitoring provider for recurrence." }],
      withEvidence: true,
      status: index === 0 ? "RESOLVED" : undefined,
    });
  }
  for (const paymentId of scenarioPaymentIds.stuckPayment) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Escalated to processing provider for status update." }],
    });
  }
  for (const paymentId of scenarioPaymentIds.invalidStatusCombination) {
    await annotateException(paymentId, {
      comments: [{ author: pick(rng, opsAnalysts).name, body: "Data-integrity issue — investigating with the settlement provider how a completed settlement was filed against this payment." }],
      withEvidence: true,
    });
  }

  // 7. UAT test cases + executions + evidence.
  const uatDefs = [
    { area: "Payments", title: "Payments list loads with all required columns", expectedResult: "Reference, customer, amount, currency, method, status, settlement status, created and expected settlement date are all visible." },
    { area: "Payments", title: "Status filter narrows the payments list", expectedResult: "Selecting a payment status returns only payments with that status." },
    { area: "Reconciliation", title: "Running reconciliation produces a completed run summary", expectedResult: "Run status, counts by rule and severity, and exceptions created are all displayed." },
    { area: "Payments", title: "Currency filter restricts results to selected currency", expectedResult: "Only EUR or only GBP payments are shown as selected." },
    { area: "Payments", title: "Search by payment reference returns exact match", expectedResult: "Entering a payment reference returns exactly that payment." },
    { area: "Exceptions", title: "Exceptions list filters by type, severity, status and SLA state", expectedResult: "Each filter narrows the list to matching exception cases." },
    { area: "Payments", title: "Payment detail shows settlement information when present", expectedResult: "Settlement reference, amount, status and settled date are displayed." },
    { area: "Payments", title: "Payment detail shows empty state when no settlement exists", expectedResult: "A clear explanatory empty state is shown instead of blank space." },
    { area: "Reconciliation", title: "Re-running reconciliation does not duplicate open exceptions", expectedResult: "The same unresolved issue links to its existing exception rather than creating a new one." },
    { area: "Settlements", title: "Settlements list links back to the correct payment detail page", expectedResult: "Clicking a settlement row navigates to the linked payment's detail page." },
  ] as const;

  const executionStatuses = ["PASSED", "PASSED", "FAILED", "BLOCKED", "NOT_RUN", "PASSED", "PASSED", "FAILED", "PASSED", "NOT_RUN"] as const;

  for (let i = 0; i < uatDefs.length; i++) {
    const def = uatDefs[i];
    const testCase = await prisma.uATTestCase.create({
      data: {
        testCaseRef: makeReference("UAT-TC", i + 1),
        title: def.title,
        description: `Confirms that: ${def.title.toLowerCase()}.`,
        steps: "1. Navigate to the relevant page.\n2. Apply the condition under test.\n3. Observe the result against the expected outcome.",
        expectedResult: def.expectedResult,
        area: def.area,
      },
    });

    const status = executionStatuses[i];
    const executedBy = pick(rng, [...uatLeads, ...appSupport]).name;
    const executedAt = status === "NOT_RUN" ? null : daysAgo(randomInt(rng, 1, 10), now);
    const execution = await prisma.uATExecution.create({
      data: {
        uatTestCaseId: testCase.id,
        status,
        executedAt,
        executedBy: status === "NOT_RUN" ? null : executedBy,
        actualResult:
          status === "PASSED" ? def.expectedResult : status === "FAILED" ? "Result did not match expectation — see evidence." : null,
        notes: status === "BLOCKED" ? "Blocked pending environment fix." : null,
      },
    });

    if (status === "PASSED" || status === "FAILED") {
      await prisma.evidenceRecord.create({
        data: {
          evidenceRef: makeReference("EVD-UAT", i + 1),
          type: "SCREENSHOT",
          title: `${testCase.testCaseRef} execution evidence`,
          description: `Captured evidence for ${status === "PASSED" ? "successful" : "failed"} execution of ${testCase.testCaseRef}.`,
          fileReference: `/evidence/${testCase.testCaseRef.toLowerCase()}-${status.toLowerCase()}.png`,
          uatExecutionId: execution.id,
        },
      });
    }
  }

  console.log("Seed complete:");
  console.log(`  Users: ${users.length}`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Payments: ${createdPayments.length}`);
  console.log(`  Settlements: ${createdPayments.filter((p) => p.settlement).length}`);
  console.log(`  UAT test cases: ${uatDefs.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
