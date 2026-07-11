import type { PaymentInput, SettlementInput } from "../types";

export function makePayment(overrides: Partial<PaymentInput> = {}): PaymentInput {
  return {
    id: "payment-1",
    customerId: "customer-1",
    paymentReference: "PAY-000001",
    amountMinor: 10000,
    currency: "EUR",
    paymentMethod: "SEPA_CREDIT_TRANSFER",
    status: "COMPLETED",
    createdAt: new Date("2026-06-01T00:00:00Z"),
    expectedSettlementAt: new Date("2026-06-03T00:00:00Z"),
    ...overrides,
  };
}

export function makeSettlement(overrides: Partial<SettlementInput> = {}): SettlementInput {
  return {
    id: "settlement-1",
    amountMinor: 10000,
    currency: "EUR",
    status: "SETTLED",
    settledAt: new Date("2026-06-02T00:00:00Z"),
    ...overrides,
  };
}
