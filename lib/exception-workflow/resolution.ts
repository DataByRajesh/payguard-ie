import { EXCEPTION_WORKFLOW_CONFIG } from "./config";
import type { ExceptionStatusValue, ReadinessResult } from "./types";

export interface ResolutionReadinessInput {
  status: ExceptionStatusValue;
  assignedUserId: string | null;
  rootCauseCategory: string | null;
  rootCauseSummary: string | null;
}

/** Pure check for whether a case has everything required to submit a resolution. */
export function assessResolutionReadiness(input: ResolutionReadinessInput): ReadinessResult {
  const reasons: string[] = [];

  if (input.status !== "INVESTIGATING") {
    reasons.push("The case must be in INVESTIGATING status to submit a resolution.");
  }
  if (!input.assignedUserId) {
    reasons.push("The case must have an assigned owner before it can be resolved.");
  }
  if (!input.rootCauseCategory) {
    reasons.push("A root-cause category must be recorded before resolution.");
  }
  if (!input.rootCauseSummary || input.rootCauseSummary.trim().length < EXCEPTION_WORKFLOW_CONFIG.minRootCauseSummaryLength) {
    reasons.push(
      `A meaningful root-cause summary (at least ${EXCEPTION_WORKFLOW_CONFIG.minRootCauseSummaryLength} characters) is required before resolution.`,
    );
  }

  return { ready: reasons.length === 0, reasons };
}
