import { describe, expect, it } from "vitest";
import { evaluateInvalidStatusCombination } from "./invalidStatusCombination";
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

describe("evaluateInvalidStatusCombination", () => {
  it("passes when no settlement exists", () => {
    const result = evaluateInvalidStatusCombination(context({ settlement: null }));
    expect(result.passed).toBe(true);
  });

  it("passes for a valid combination (COMPLETED payment, SETTLED settlement)", () => {
    const result = evaluateInvalidStatusCombination(context());
    expect(result.passed).toBe(true);
  });

  it("fails with CRITICAL severity for a FAILED payment with a SETTLED settlement", () => {
    const result = evaluateInvalidStatusCombination(
      context({ payment: makePayment({ status: "FAILED" }), settlement: makeSettlement({ status: "SETTLED" }) }),
    );
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("CRITICAL");
  });

  it("fails for a REVERSED (cancelled) payment with a SETTLED settlement", () => {
    const result = evaluateInvalidStatusCombination(
      context({ payment: makePayment({ status: "REVERSED" }), settlement: makeSettlement({ status: "SETTLED" }) }),
    );
    expect(result.passed).toBe(false);
  });

  it("fails for a PENDING payment with a SETTLED settlement", () => {
    const result = evaluateInvalidStatusCombination(
      context({ payment: makePayment({ status: "PENDING" }), settlement: makeSettlement({ status: "SETTLED" }) }),
    );
    expect(result.passed).toBe(false);
  });

  it("passes for a FAILED payment with a non-SETTLED settlement", () => {
    const result = evaluateInvalidStatusCombination(
      context({ payment: makePayment({ status: "FAILED" }), settlement: makeSettlement({ status: "FAILED" }) }),
    );
    expect(result.passed).toBe(true);
  });
});
