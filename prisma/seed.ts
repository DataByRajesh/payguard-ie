import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Customer, type Payment, type PaymentStatus, type Settlement, type SettlementStatus } from "../app/generated/prisma/client";
import { runReconciliation } from "../lib/reconciliation-engine/service";
import {
  assignException,
  startInvestigation,
  requestInformation,
  recordRootCause,
  submitResolution,
  approveException,
  rejectException,
  addEvidenceToException,
} from "../lib/exception-workflow/service";
import { executeUatCase, addUatEvidence } from "../lib/uat-workflow/service";
import {
  createRng,
  pick,
  randomInt,
  hoursAgo,
  hoursFromNow,
  daysAgo,
  daysFromNow,
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

async function versionOf(exceptionCaseId: string): Promise<number> {
  const row = await prisma.exceptionCase.findUniqueOrThrow({ where: { id: exceptionCaseId }, select: { version: true } });
  return row.version;
}

async function firstExceptionForPayment(paymentId: string) {
  return prisma.exceptionCase.findFirstOrThrow({ where: { paymentId }, orderBy: { createdAt: "asc" } });
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

  // 2. Users — includes two inactive users to demonstrate that inactive users cannot be assigned.
  const userDefs = [
    { name: "Aisling Byrne", role: "OPS_ANALYST", isActive: true },
    { name: "Conor Walsh", role: "OPS_ANALYST", isActive: true },
    { name: "Sophie Bennett", role: "OPS_ANALYST", isActive: true },
    { name: "Emma Whittaker", role: "APP_SUPPORT", isActive: true },
    { name: "James Carter", role: "APP_SUPPORT", isActive: true },
    { name: "Liam Foley", role: "APP_SUPPORT", isActive: true },
    { name: "Niamh Doyle", role: "UAT_LEAD", isActive: true },
    { name: "Chloe Fitzgerald", role: "UAT_LEAD", isActive: true },
    { name: "Ryan O'Brien", role: "ADMIN", isActive: true },
    { name: "Declan Murphy", role: "OPS_ANALYST", isActive: false },
    { name: "Grace Taylor", role: "APP_SUPPORT", isActive: false },
  ] as const;

  const users = [];
  for (const def of userDefs) {
    const email = `${def.name.toLowerCase().replace(/[^a-z]+/g, ".")}@payguard-ie.example`;
    users.push(await prisma.user.create({ data: { email, name: def.name, role: def.role, isActive: def.isActive } }));
  }
  const opsAnalysts = users.filter((u) => u.role === "OPS_ANALYST" && u.isActive);
  const uatLeads = users.filter((u) => u.role === "UAT_LEAD" && u.isActive);
  const appSupport = users.filter((u) => u.role === "APP_SUPPORT" && u.isActive);

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

  // Payment ids per scenario, so we can drive the engine-created exceptions through the
  // lifecycle afterwards using the real workflow service (not hand-crafted rows).
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
  // (the reconciliation engine's missing-settlement rule detects these live).
  for (let i = 0; i < 2; i++) {
    const customer = nextCustomer(i + 15);
    const currency = currencyFor(customer);
    const createdAt = hoursAgo(randomInt(rng, 6, 36), now);
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
  // ReconciliationRun, ReconciliationResult and ExceptionCase rows now — every exception
  // below starts life exactly as it would in the running application (status NEW, unassigned).
  const runResult = await runReconciliation(now);
  console.log(
    `Reconciliation run ${runResult.runReference}: ${runResult.summary.passedCount} passed, ${runResult.summary.failedCount} failed, ${runResult.summary.exceptionsCreated} exceptions created.`,
  );

  // 6. Drive a representative slice of the engine-created exceptions through the real
  // lifecycle service (assign → investigate → root cause → resolve → approve/reject), so the
  // seeded application demonstrates every required scenario using the exact same validated
  // code path a real analyst's click would go through — not hand-crafted rows.

  // missingSettlement[0] -> left exactly as the engine created it: NEW, unassigned.
  // missingSettlement[1] -> assigned only.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.missingSettlement[1]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now: hoursFromNow(1, now),
      actorName: "SYSTEM",
      assignToUserId: assignee.id,
      assigneeName: assignee.name,
      assignedByUserId: pick(rng, uatLeads.concat(opsAnalysts)).id,
      note: "Please chase the settlement provider for this reference.",
    });
  }

  // amountMismatch[0] -> INVESTIGATING.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.amountMismatch[0]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, {
      expectedVersion: exceptionCase.version,
      now: hoursFromNow(1, now),
      actorName: "SYSTEM",
      assignToUserId: assignee.id,
      assigneeName: assignee.name,
      assignedByUserId: assignee.id,
      note: null,
    });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: assignee.name });
  }

  // amountMismatch[1] -> AWAITING_INFORMATION.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.amountMismatch[1]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: assignee.id, assigneeName: assignee.name, assignedByUserId: assignee.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: assignee.name });
    await requestInformation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(3, now), actorName: assignee.name });
  }

  // amountMismatch[2] -> RESOLVED, awaiting approval.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.amountMismatch[2]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: assignee.id, assigneeName: assignee.name, assignedByUserId: assignee.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: assignee.name });
    await recordRootCause(exceptionCase.id, {
      expectedVersion: await versionOf(exceptionCase.id),
      now: hoursFromNow(4, now),
      actorName: assignee.name,
      rootCauseCategory: "DATA_MAPPING_ERROR",
      rootCauseSummary: "Settlement file mapped the fee amount into the principal field, inflating the settled total.",
      identifiedByUserId: assignee.id,
    });
    await submitResolution(exceptionCase.id, {
      expectedVersion: await versionOf(exceptionCase.id),
      now: hoursFromNow(6, now),
      actorName: assignee.name,
      resolutionAction: "CONFIGURATION_CORRECTED",
      resolutionSummary: "Settlement provider corrected the file mapping and re-sent a corrected settlement record.",
      resolutionUserId: assignee.id,
    });
  }

  // amountMismatch[3] -> CLOSED on time.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.amountMismatch[3]);
    const resolver = opsAnalysts[0];
    const approver = opsAnalysts[1];
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: resolver.id, assigneeName: resolver.name, assignedByUserId: resolver.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: resolver.name });
    await recordRootCause(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(4, now), actorName: resolver.name, rootCauseCategory: "CURRENCY_CONFIGURATION", rootCauseSummary: "FX conversion step used a stale rate table for this settlement batch.", identifiedByUserId: resolver.id });
    await submitResolution(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(6, now), actorName: resolver.name, resolutionAction: "CORRECTIVE_SETTLEMENT_APPLIED", resolutionSummary: "Rate table refreshed and a corrective settlement entry applied to match the payment amount.", resolutionUserId: resolver.id });
    await addEvidenceToException(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(6, now), actorName: resolver.name, evidenceType: "QUERY_RESULT", title: "Corrective settlement query result", description: "Query confirming the corrective settlement entry matches the payment amount.", fileReference: null, addedByUserId: resolver.id });
    await approveException(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(8, now), actorName: approver.name, approverUserId: approver.id, approvalNote: "Confirmed the corrective entry — closing." });
  }

  // amountMismatch[4] -> CLOSED late (approved well after the exception's SLA deadline).
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.amountMismatch[4]);
    const resolver = opsAnalysts[1];
    const approver = opsAnalysts[2];
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: resolver.id, assigneeName: resolver.name, assignedByUserId: resolver.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: resolver.name });
    await recordRootCause(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: daysFromNow(2, now), actorName: resolver.name, rootCauseCategory: "MANUAL_PROCESSING_ERROR", rootCauseSummary: "Manual settlement entry was keyed with a transposed digit in the amount field.", identifiedByUserId: resolver.id });
    await submitResolution(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: daysFromNow(3, now), actorName: resolver.name, resolutionAction: "CORRECTIVE_SETTLEMENT_APPLIED", resolutionSummary: "Corrected the keyed amount and re-applied the settlement entry.", resolutionUserId: resolver.id });
    await addEvidenceToException(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: daysFromNow(3, now), actorName: resolver.name, evidenceType: "SCREENSHOT", title: "Corrected entry screenshot", description: "Screenshot of the corrected manual entry.", fileReference: "/evidence/amount-mismatch-corrected.png", addedByUserId: resolver.id });
    // Approved well past the exception's SLA deadline (max 7 days for LOW severity) to guarantee "closed late".
    await approveException(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: daysFromNow(10, now), actorName: approver.name, approverUserId: approver.id, approvalNote: "Apologies for the delay reviewing — confirmed correct, closing." });
  }

  // currencyMismatch[0] -> assigned + investigating, then forced overdue (deterministically, regardless
  // of when this seed is run or viewed) so there is always a guaranteed "overdue open case" example.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.currencyMismatch[0]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: assignee.id, assigneeName: assignee.name, assignedByUserId: assignee.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: assignee.name });
    await prisma.exceptionCase.update({ where: { id: exceptionCase.id }, data: { slaDeadline: daysAgo(2, now) } });
  }

  // duplicate[0] -> assigned, for queue variety.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.duplicate[0]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: assignee.id, assigneeName: assignee.name, assignedByUserId: assignee.id, note: "Confirm with customer service before reversing." });
  }

  // delayedSettlement[0] -> investigating; used below as the "UAT fail linked to an exception" target.
  const linkedExceptionId = (await (async () => {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.delayedSettlement[0]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: assignee.id, assigneeName: assignee.name, assignedByUserId: assignee.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: assignee.name });
    return exceptionCase.id;
  })());

  // delayedSettlement[1] -> resolved, then rejected by a different user, demonstrating the
  // RESOLVED -> INVESTIGATING rejection path with a full audit trail.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.delayedSettlement[1]);
    const resolver = opsAnalysts[0];
    const approver = opsAnalysts[1];
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: resolver.id, assigneeName: resolver.name, assignedByUserId: resolver.id, note: null });
    await startInvestigation(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(2, now), actorName: resolver.name });
    await recordRootCause(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(4, now), actorName: resolver.name, rootCauseCategory: "UPSTREAM_PROVIDER_DELAY", rootCauseSummary: "Settlement provider's overnight batch ran late for this settlement cycle.", identifiedByUserId: resolver.id });
    await submitResolution(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(6, now), actorName: resolver.name, resolutionAction: "UPSTREAM_PROVIDER_CONFIRMED", resolutionSummary: "Provider confirmed a one-off batch delay with no further action needed.", resolutionUserId: resolver.id });
    await rejectException(exceptionCase.id, { expectedVersion: await versionOf(exceptionCase.id), now: hoursFromNow(8, now), actorName: approver.name, approverUserId: approver.id, approvalNote: "Please get written confirmation from the provider before we accept this as a one-off." });
  }

  // stuckPayment[0] -> assigned, for queue variety. The rest stay NEW/unassigned.
  {
    const exceptionCase = await firstExceptionForPayment(scenarioPaymentIds.stuckPayment[0]);
    const assignee = pick(rng, opsAnalysts);
    await assignException(exceptionCase.id, { expectedVersion: exceptionCase.version, now: hoursFromNow(1, now), actorName: "SYSTEM", assignToUserId: assignee.id, assigneeName: assignee.name, assignedByUserId: assignee.id, note: null });
  }

  console.log("Exception lifecycle scenarios applied.");

  // 7. UAT test cases + executions + evidence.
  const uatDefs = [
    { area: "Payments", requirementReference: "REQ-PAY-001", title: "Payments list loads with all required columns", expectedResult: "Reference, customer, amount, currency, method, status, settlement status, created and expected settlement date are all visible." },
    { area: "Payments", requirementReference: "REQ-PAY-002", title: "Status filter narrows the payments list", expectedResult: "Selecting a payment status returns only payments with that status." },
    { area: "Reconciliation", requirementReference: "REQ-RECON-001", title: "Running reconciliation produces a completed run summary", expectedResult: "Run status, counts by rule and severity, and exceptions created are all displayed." },
    { area: "Payments", requirementReference: "REQ-PAY-003", title: "Currency filter restricts results to selected currency", expectedResult: "Only EUR or only GBP payments are shown as selected." },
    { area: "Exceptions", requirementReference: "REQ-EXC-001", title: "Exception detail rejects a resolution submitted without a root cause", expectedResult: "The resolve action is unavailable until a root cause is recorded." },
    { area: "Exceptions", requirementReference: "REQ-EXC-002", title: "Exceptions list filters by status, severity, owner, SLA state and root cause", expectedResult: "Each filter narrows the list to matching exception cases." },
    { area: "Exceptions", requirementReference: "REQ-EXC-003", title: "Approval requires a different user from the resolver", expectedResult: "Approving with the same acting user as the resolver is blocked with a clear message." },
    { area: "Payments", requirementReference: "REQ-PAY-004", title: "Payment detail shows empty state when no settlement exists", expectedResult: "A clear explanatory empty state is shown instead of blank space." },
    { area: "Reconciliation", requirementReference: "REQ-RECON-002", title: "Re-running reconciliation does not duplicate open exceptions", expectedResult: "The same unresolved issue links to its existing exception rather than creating a new one." },
    { area: "UAT", requirementReference: "REQ-UAT-001", title: "A failed UAT execution can be linked to an existing exception case", expectedResult: "The linked exception reference is visible from the UAT execution." },
  ] as const;

  const executionPlan = ["PASS", "PASS", "FAIL", "BLOCKED", "NOT_RUN", "PASS", "PASS", "FAIL", "PASS", "FAIL"] as const;

  const uatExecutionIds: string[] = [];
  for (let i = 0; i < uatDefs.length; i++) {
    const def = uatDefs[i];
    const testCase = await prisma.uATTestCase.create({
      data: {
        testCaseRef: makeReference("UAT-TC", i + 1),
        title: def.title,
        description: `Confirms that: ${def.title.toLowerCase()}.`,
        requirementReference: def.requirementReference,
        preconditions: "Application seeded with deterministic demo data.",
        steps: "1. Navigate to the relevant page.\n2. Apply the condition under test.\n3. Observe the result against the expected outcome.",
        expectedResult: def.expectedResult,
        area: def.area,
      },
    });

    const status = executionPlan[i];
    const isLastFail = i === executionPlan.length - 1 && status === "FAIL";
    const tester = pick(rng, [...uatLeads, ...appSupport]);
    const execution = await executeUatCase({
      testCaseId: testCase.id,
      status,
      actualResult: status === "PASS" ? def.expectedResult : status === "FAIL" ? "Result did not match expectation — see linked exception or evidence." : null,
      notes: status === "BLOCKED" ? "Blocked pending environment fix." : null,
      testerUserId: tester.id,
      testerName: tester.name,
      linkedExceptionCaseId: isLastFail ? linkedExceptionId : null,
      now: status === "NOT_RUN" ? now : daysAgo(randomInt(rng, 1, 10), now),
    });
    uatExecutionIds.push(execution.id);

    if (status === "PASS" || status === "FAIL") {
      await addUatEvidence({
        executionId: execution.id,
        evidenceType: "SCREENSHOT",
        title: `${testCase.testCaseRef} execution evidence`,
        description: `Captured evidence for the ${status} execution of ${testCase.testCaseRef}.`,
        fileReference: `/evidence/${testCase.testCaseRef.toLowerCase()}-${status.toLowerCase()}.png`,
        addedByUserId: tester.id,
        actorName: tester.name,
        now: execution.executedAt ?? now,
      });
    }
  }

  console.log("Seed complete:");
  console.log(`  Users: ${users.length} (${users.filter((u) => !u.isActive).length} inactive)`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Payments: ${createdPayments.length}`);
  console.log(`  Settlements: ${createdPayments.filter((p) => p.settlement).length}`);
  console.log(`  UAT test cases: ${uatDefs.length}, executions: ${uatExecutionIds.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
