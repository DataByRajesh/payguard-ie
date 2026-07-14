"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runReconciliation, ReconciliationAlreadyRunningError } from "@/lib/reconciliation-engine/service";
import { isDemoReadOnly, demoReadOnlyResult } from "@/lib/demo-mode";
import { getActingUser } from "@/lib/acting-user";
import { requirePermission } from "@/lib/auth/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const runReconciliationInputSchema = z.object({});

export interface RunReconciliationActionResult {
  success: boolean;
  message: string;
  runId?: string;
}

export async function runReconciliationAction(): Promise<RunReconciliationActionResult> {
  if (isDemoReadOnly()) return demoReadOnlyResult();
  runReconciliationInputSchema.parse({});

  const actor = await getActingUser();
  const denial = requirePermission<RunReconciliationActionResult>(actor, "RECONCILIATION_RUN");
  if (denial) return denial;
  // Lower cap than the default 20/min -- a full run loads every payment and writes a result per
  // rule evaluation (~350 sequential writes at this project's seed scale), so it's much heavier
  // per call than the exception/UAT actions using the default limit.
  const rateLimited = await checkRateLimit<RunReconciliationActionResult>(actor.id, "runReconciliation", { max: 5 });
  if (rateLimited) return rateLimited;

  try {
    const result = await runReconciliation(actor.id);
    revalidatePath("/reconciliation");
    revalidatePath("/exceptions");

    return {
      success: true,
      message: `Run ${result.runReference} completed: ${result.summary.passedCount} passed, ${result.summary.failedCount} failed, ${result.summary.exceptionsCreated} new exceptions.`,
      runId: result.runId,
    };
  } catch (error) {
    if (error instanceof ReconciliationAlreadyRunningError) {
      return { success: false, message: error.message };
    }
    logger.error("reconciliation_run_failed", { error });
    return { success: false, message: "Reconciliation run failed. Check server logs for details." };
  }
}
