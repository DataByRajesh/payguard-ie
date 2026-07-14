"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runReconciliation, ReconciliationAlreadyRunningError } from "@/lib/reconciliation-engine/service";
import { isDemoReadOnly, demoReadOnlyResult } from "@/lib/demo-mode";
import { getActingUser } from "@/lib/acting-user";
import { requirePermission } from "@/lib/auth/permissions";

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
    console.error("Reconciliation run failed:", error);
    return { success: false, message: "Reconciliation run failed. Check server logs for details." };
  }
}
