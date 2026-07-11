import { evaluateAllRules } from "./rules";
import { buildRunSummary } from "./summary";
import { createRunningRun, completeRun, failRun, hasRunningRun, loadReconciliationInputs, persistResults } from "./persistence";
import type { ReconciliationRunSummary } from "./summary";
import type { RuleEvaluation } from "./types";

export interface ReconciliationRunResult {
  runId: string;
  runReference: string;
  summary: ReconciliationRunSummary;
}

export class ReconciliationAlreadyRunningError extends Error {
  constructor() {
    super("A reconciliation run is already in progress.");
    this.name = "ReconciliationAlreadyRunningError";
  }
}

/**
 * Orchestrates a full reconciliation run: loads payments/settlements, evaluates every
 * rule against every payment, persists results and idempotent exceptions, and marks the
 * run completed (or failed). Never touches Prisma directly — only through persistence.ts.
 */
export async function runReconciliation(now: Date = new Date()): Promise<ReconciliationRunResult> {
  if (await hasRunningRun()) {
    throw new ReconciliationAlreadyRunningError();
  }

  const run = await createRunningRun(now);

  try {
    const loaded = await loadReconciliationInputs();
    const allPayments = loaded.map((entry) => entry.payment);
    const totalSettlements = loaded.filter((entry) => entry.settlement !== null).length;

    const evaluations: RuleEvaluation[] = [];
    for (const { payment, settlement } of loaded) {
      evaluations.push(...evaluateAllRules({ payment, settlement, allPayments, now }));
    }

    const exceptionsCreated = await persistResults(run.id, evaluations, now);
    const completedAt = new Date();

    const summary = buildRunSummary({
      results: evaluations,
      startedAt: run.startedAt,
      completedAt,
      totalPayments: loaded.length,
      totalSettlements,
      exceptionsCreated,
    });

    await completeRun(run.id, summary);

    return { runId: run.id, runReference: run.runReference, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during reconciliation run.";
    await failRun(run.id, message, new Date());
    throw error;
  }
}
