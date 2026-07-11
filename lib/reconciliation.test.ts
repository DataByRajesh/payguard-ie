import { describe, expect, it } from "vitest";
import { deriveSettlementDisplayStatus, isPastSla } from "@/lib/reconciliation";

const NOW = new Date("2026-06-15T12:00:00Z");

function payment(overrides: Partial<Parameters<typeof deriveSettlementDisplayStatus>[0]> = {}) {
  return {
    status: "COMPLETED" as const,
    currency: "EUR",
    amountMinor: 10000,
    expectedSettlementAt: new Date("2026-06-10T12:00:00Z"),
    ...overrides,
  };
}

describe("isPastSla", () => {
  it("returns true when expected settlement date is before now", () => {
    expect(isPastSla({ expectedSettlementAt: new Date("2026-06-01T00:00:00Z") }, NOW)).toBe(true);
  });

  it("returns false when expected settlement date is after now", () => {
    expect(isPastSla({ expectedSettlementAt: new Date("2026-07-01T00:00:00Z") }, NOW)).toBe(false);
  });
});

describe("deriveSettlementDisplayStatus", () => {
  it("returns FAILED_PAYMENT when the payment status is FAILED, regardless of settlement", () => {
    expect(deriveSettlementDisplayStatus(payment({ status: "FAILED" }), null, NOW)).toBe("FAILED_PAYMENT");
  });

  it("returns MISSING when there is no settlement and the SLA has passed", () => {
    expect(
      deriveSettlementDisplayStatus(payment({ expectedSettlementAt: new Date("2026-06-01T00:00:00Z") }), null, NOW),
    ).toBe("MISSING");
  });

  it("returns PENDING when there is no settlement but the SLA has not passed", () => {
    expect(
      deriveSettlementDisplayStatus(payment({ expectedSettlementAt: new Date("2026-07-01T00:00:00Z") }), null, NOW),
    ).toBe("PENDING");
  });

  it("returns CURRENCY_MISMATCH when settlement currency differs from payment currency", () => {
    const settlement = { currency: "GBP", amountMinor: 10000, status: "SETTLED" as const, settledAt: new Date("2026-06-09T00:00:00Z") };
    expect(deriveSettlementDisplayStatus(payment(), settlement, NOW)).toBe("CURRENCY_MISMATCH");
  });

  it("returns AMOUNT_MISMATCH when settlement amount differs from payment amount", () => {
    const settlement = { currency: "EUR", amountMinor: 9500, status: "SETTLED" as const, settledAt: new Date("2026-06-09T00:00:00Z") };
    expect(deriveSettlementDisplayStatus(payment(), settlement, NOW)).toBe("AMOUNT_MISMATCH");
  });

  it("returns DELAYED when settlement occurred after the expected settlement date", () => {
    const settlement = { currency: "EUR", amountMinor: 10000, status: "SETTLED" as const, settledAt: new Date("2026-06-12T00:00:00Z") };
    expect(deriveSettlementDisplayStatus(payment(), settlement, NOW)).toBe("DELAYED");
  });

  it("returns MATCHED when currency, amount and settlement date all line up", () => {
    const settlement = { currency: "EUR", amountMinor: 10000, status: "SETTLED" as const, settledAt: new Date("2026-06-09T00:00:00Z") };
    expect(deriveSettlementDisplayStatus(payment(), settlement, NOW)).toBe("MATCHED");
  });

  it("returns PENDING when the settlement exists but has not settled yet", () => {
    const settlement = { currency: "EUR", amountMinor: 10000, status: "PENDING" as const, settledAt: null };
    expect(deriveSettlementDisplayStatus(payment(), settlement, NOW)).toBe("PENDING");
  });
});
