import { RULE_TYPES, SEVERITIES } from "./types";
import type { RuleEvaluation, RuleType, Severity } from "./types";

export interface ReconciliationRunSummary {
  status: "COMPLETED";
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  totalPayments: number;
  totalSettlements: number;
  totalResults: number;
  passedCount: number;
  failedCount: number;
  exceptionsCreated: number;
  countsByRule: Record<RuleType, number>;
  countsBySeverity: Record<Severity, number>;
}

/** Pure aggregation of a run's rule evaluations into the typed summary shape returned to the UI. */
export function buildRunSummary(params: {
  results: RuleEvaluation[];
  startedAt: Date;
  completedAt: Date;
  totalPayments: number;
  totalSettlements: number;
  exceptionsCreated: number;
}): ReconciliationRunSummary {
  const countsByRule = Object.fromEntries(RULE_TYPES.map((rule) => [rule, 0])) as Record<RuleType, number>;
  const countsBySeverity = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<Severity, number>;

  let passedCount = 0;
  let failedCount = 0;

  for (const result of params.results) {
    countsByRule[result.rule] += 1;
    if (result.passed) {
      passedCount += 1;
    } else {
      failedCount += 1;
      countsBySeverity[result.severity] += 1;
    }
  }

  return {
    status: "COMPLETED",
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    durationMs: params.completedAt.getTime() - params.startedAt.getTime(),
    totalPayments: params.totalPayments,
    totalSettlements: params.totalSettlements,
    totalResults: params.results.length,
    passedCount,
    failedCount,
    exceptionsCreated: params.exceptionsCreated,
    countsByRule,
    countsBySeverity,
  };
}
