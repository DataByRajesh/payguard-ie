import { describe, expect, it } from "vitest";
import { evaluateDuplicatePayment } from "./duplicatePayment";
import { makePayment } from "./testHelpers";
import type { RuleContext } from "../types";

function context(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    payment: makePayment({ id: "payment-2", paymentReference: "PAY-000002", createdAt: new Date("2026-06-01T02:00:00Z") }),
    settlement: null,
    allPayments: [],
    now: new Date("2026-06-05T00:00:00Z"),
    ...overrides,
  };
}

describe("evaluateDuplicatePayment", () => {
  it("fails when an earlier payment with an identical fingerprint exists within the window", () => {
    const original = makePayment({ id: "payment-1", paymentReference: "PAY-000001", createdAt: new Date("2026-06-01T00:00:00Z") });
    const result = evaluateDuplicatePayment(context({ allPayments: [original, context().payment] }));
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.severity).toBe("CRITICAL");
      expect(result.expectedValue).toBe("PAY-000001");
      expect(result.metadata?.originalPaymentId).toBe("payment-1");
    }
  });

  it("passes when no other payment shares the fingerprint", () => {
    const other = makePayment({ id: "payment-1", customerId: "customer-2", createdAt: new Date("2026-06-01T00:00:00Z") });
    const result = evaluateDuplicatePayment(context({ allPayments: [other, context().payment] }));
    expect(result.passed).toBe(true);
  });

  it("passes when the matching payment falls outside the duplicate window", () => {
    const original = makePayment({ id: "payment-1", createdAt: new Date("2026-05-30T00:00:00Z") });
    const result = evaluateDuplicatePayment(context({ allPayments: [original, context().payment] }));
    expect(result.passed).toBe(true);
  });

  it("does not flag itself as a duplicate of itself", () => {
    const result = evaluateDuplicatePayment(context({ allPayments: [context().payment] }));
    expect(result.passed).toBe(true);
  });

  it("flags only the later payment, not the earlier one", () => {
    const earlier = makePayment({ id: "payment-1", createdAt: new Date("2026-06-01T00:00:00Z") });
    const laterContext = context();
    const earlierResult = evaluateDuplicatePayment({ ...laterContext, payment: earlier, allPayments: [earlier, laterContext.payment] });
    expect(earlierResult.passed).toBe(true);
  });
});
