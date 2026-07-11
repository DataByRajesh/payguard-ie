import { describe, expect, it } from "vitest";
import { evaluateCurrencyMismatch } from "./currencyMismatch";
import { makePayment, makeSettlement } from "./testHelpers";
import type { RuleContext } from "../types";

function context(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    payment: makePayment(),
    settlement: makeSettlement(),
    allPayments: [],
    now: new Date("2026-06-05T00:00:00Z"),
    ...overrides,
  };
}

describe("evaluateCurrencyMismatch", () => {
  it("passes when settlement currency matches payment currency", () => {
    const result = evaluateCurrencyMismatch(context());
    expect(result.passed).toBe(true);
  });

  it("passes when no settlement exists yet", () => {
    const result = evaluateCurrencyMismatch(context({ settlement: null }));
    expect(result.passed).toBe(true);
  });

  it("fails with HIGH severity when currencies differ", () => {
    const result = evaluateCurrencyMismatch(context({ settlement: makeSettlement({ currency: "GBP" }) }));
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.severity).toBe("HIGH");
      expect(result.expectedValue).toBe("EUR");
      expect(result.actualValue).toBe("GBP");
    }
  });
});
