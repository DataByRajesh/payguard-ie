import { describe, expect, it } from "vitest";
import { evaluateDelayedSettlement } from "./delayedSettlement";
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

describe("evaluateDelayedSettlement", () => {
  it("passes when settled on or before the expected date", () => {
    const result = evaluateDelayedSettlement(context());
    expect(result.passed).toBe(true);
  });

  it("passes when no settlement exists yet", () => {
    const result = evaluateDelayedSettlement(context({ settlement: null }));
    expect(result.passed).toBe(true);
  });

  it("passes when settlement exists but has not settled yet (settledAt null)", () => {
    const result = evaluateDelayedSettlement(context({ settlement: makeSettlement({ status: "PENDING", settledAt: null }) }));
    expect(result.passed).toBe(true);
  });

  it("fails with LOW severity for a short delay under the medium threshold", () => {
    const result = evaluateDelayedSettlement(
      context({ settlement: makeSettlement({ settledAt: new Date("2026-06-03T05:00:00Z") }) }),
    );
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("LOW");
  });

  it("fails with MEDIUM severity at the medium-hours boundary", () => {
    const result = evaluateDelayedSettlement(
      context({ settlement: makeSettlement({ settledAt: new Date("2026-06-04T00:00:00Z") }) }),
    );
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("MEDIUM");
  });

  it("fails with HIGH severity at the high-hours boundary", () => {
    const result = evaluateDelayedSettlement(
      context({ settlement: makeSettlement({ settledAt: new Date("2026-06-06T00:00:00Z") }) }),
    );
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("HIGH");
  });
});
