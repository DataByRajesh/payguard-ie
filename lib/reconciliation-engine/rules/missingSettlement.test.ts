import { describe, expect, it } from "vitest";
import { evaluateMissingSettlement } from "./missingSettlement";
import { makePayment } from "./testHelpers";
import type { RuleContext } from "../types";

function context(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    payment: makePayment(),
    settlement: null,
    allPayments: [],
    now: new Date("2026-06-05T00:00:00Z"),
    ...overrides,
  };
}

describe("evaluateMissingSettlement", () => {
  it("fails when a completed payment has no settlement past its expected date", () => {
    const result = evaluateMissingSettlement(context());
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.rule).toBe("MISSING_SETTLEMENT");
      expect(result.severity).toBe("HIGH");
    }
  });

  it("passes when a settlement exists", () => {
    const result = evaluateMissingSettlement(
      context({
        settlement: { id: "s1", amountMinor: 10000, currency: "EUR", status: "SETTLED", settledAt: new Date("2026-06-02T00:00:00Z") },
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("passes when payment has not completed yet", () => {
    const result = evaluateMissingSettlement(context({ payment: makePayment({ status: "PENDING" }) }));
    expect(result.passed).toBe(true);
  });

  it("passes at the boundary where now equals expectedSettlementAt", () => {
    const result = evaluateMissingSettlement(context({ now: new Date("2026-06-03T00:00:00Z") }));
    expect(result.passed).toBe(true);
  });

  it("is MEDIUM severity when only just overdue (within grace period)", () => {
    const result = evaluateMissingSettlement(context({ now: new Date("2026-06-03T01:00:00Z") }));
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("MEDIUM");
  });

  it("escalates to HIGH once overdue beyond the grace period", () => {
    const result = evaluateMissingSettlement(context({ now: new Date("2026-06-04T01:00:00Z") }));
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("HIGH");
  });
});
