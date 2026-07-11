import { describe, expect, it } from "vitest";
import { evaluateAmountMismatch } from "./amountMismatch";
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

describe("evaluateAmountMismatch", () => {
  it("passes when settlement amount matches payment amount", () => {
    const result = evaluateAmountMismatch(context());
    expect(result.passed).toBe(true);
  });

  it("passes when no settlement exists yet", () => {
    const result = evaluateAmountMismatch(context({ settlement: null }));
    expect(result.passed).toBe(true);
  });

  it("fails with MEDIUM severity for a small mismatch below the high threshold", () => {
    const result = evaluateAmountMismatch(context({ settlement: makeSettlement({ amountMinor: 10500 }) }));
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.severity).toBe("MEDIUM");
      expect(result.differenceMinor).toBe(500);
    }
  });

  it("fails with HIGH severity at the configured threshold boundary", () => {
    const result = evaluateAmountMismatch(context({ settlement: makeSettlement({ amountMinor: 15000 }) }));
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("HIGH");
  });

  it("records a negative signed difference when settlement is short", () => {
    const result = evaluateAmountMismatch(context({ settlement: makeSettlement({ amountMinor: 9000 }) }));
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.differenceMinor).toBe(-1000);
  });
});
