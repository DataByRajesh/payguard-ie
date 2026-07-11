import { describe, expect, it } from "vitest";
import { buildRunSummary } from "./summary";
import type { RuleEvaluation } from "./types";

function passed(rule: RuleEvaluation["rule"]): RuleEvaluation {
  return { rule, passed: true, paymentId: "p1", settlementId: null, summary: "ok" };
}

function failed(rule: RuleEvaluation["rule"], severity: Extract<RuleEvaluation, { passed: false }>["severity"]): RuleEvaluation {
  return {
    rule,
    passed: false,
    paymentId: "p1",
    settlementId: null,
    severity,
    summary: "bad",
    expectedValue: null,
    actualValue: null,
    differenceMinor: null,
  };
}

describe("buildRunSummary", () => {
  it("counts passed and failed results and computes duration", () => {
    const summary = buildRunSummary({
      results: [passed("MISSING_SETTLEMENT"), failed("AMOUNT_MISMATCH", "HIGH")],
      startedAt: new Date("2026-06-01T00:00:00Z"),
      completedAt: new Date("2026-06-01T00:00:05Z"),
      totalPayments: 1,
      totalSettlements: 1,
      exceptionsCreated: 1,
    });

    expect(summary.totalResults).toBe(2);
    expect(summary.passedCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.durationMs).toBe(5000);
    expect(summary.countsByRule.AMOUNT_MISMATCH).toBe(1);
    expect(summary.countsByRule.MISSING_SETTLEMENT).toBe(1);
    expect(summary.countsBySeverity.HIGH).toBe(1);
  });

  it("zero-fills every rule and severity bucket even when nothing occurred", () => {
    const summary = buildRunSummary({
      results: [],
      startedAt: new Date("2026-06-01T00:00:00Z"),
      completedAt: new Date("2026-06-01T00:00:00Z"),
      totalPayments: 0,
      totalSettlements: 0,
      exceptionsCreated: 0,
    });

    expect(summary.countsByRule.DUPLICATE_PAYMENT).toBe(0);
    expect(summary.countsBySeverity.CRITICAL).toBe(0);
    expect(summary.durationMs).toBe(0);
  });

  it("only tallies severity for failed results, not passed ones", () => {
    const summary = buildRunSummary({
      results: [passed("CURRENCY_MISMATCH"), passed("CURRENCY_MISMATCH")],
      startedAt: new Date("2026-06-01T00:00:00Z"),
      completedAt: new Date("2026-06-01T00:00:00Z"),
      totalPayments: 2,
      totalSettlements: 2,
      exceptionsCreated: 0,
    });

    expect(summary.passedCount).toBe(2);
    expect(summary.failedCount).toBe(0);
    const totalSeverityCount = Object.values(summary.countsBySeverity).reduce((a, b) => a + b, 0);
    expect(totalSeverityCount).toBe(0);
  });
});
