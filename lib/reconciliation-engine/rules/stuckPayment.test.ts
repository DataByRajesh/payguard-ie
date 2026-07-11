import { describe, expect, it } from "vitest";
import { evaluateStuckPayment } from "./stuckPayment";
import { makePayment } from "./testHelpers";
import type { RuleContext } from "../types";

function context(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    payment: makePayment({ status: "PENDING", createdAt: new Date("2026-06-01T00:00:00Z") }),
    settlement: null,
    allPayments: [],
    now: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  };
}

describe("evaluateStuckPayment", () => {
  it("passes when the payment is not pending", () => {
    const result = evaluateStuckPayment(context({ payment: makePayment({ status: "COMPLETED" }) }));
    expect(result.passed).toBe(true);
  });

  it("passes when pending but still within the SLA", () => {
    const result = evaluateStuckPayment(context({ now: new Date("2026-06-02T00:00:00Z") }));
    expect(result.passed).toBe(true);
  });

  it("passes at the exact SLA boundary (not yet over)", () => {
    const result = evaluateStuckPayment(context({ now: new Date("2026-06-02T23:59:59Z") }));
    expect(result.passed).toBe(true);
  });

  it("fails with HIGH severity once the SLA has elapsed", () => {
    const result = evaluateStuckPayment(context({ now: new Date("2026-06-03T00:00:01Z") }));
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("HIGH");
  });

  it("escalates to CRITICAL once pending for double the SLA", () => {
    const result = evaluateStuckPayment(context({ now: new Date("2026-06-05T00:00:00Z") }));
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.severity).toBe("CRITICAL");
  });
});
