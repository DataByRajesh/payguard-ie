import { EXCEPTION_WORKFLOW_CONFIG } from "./config";
import type { SlaState } from "./types";

export interface SlaAssessment {
  state: SlaState;
  /** Milliseconds remaining until the deadline; null once the case is closed or has no deadline. */
  remainingMs: number | null;
  /** Milliseconds past the deadline; null unless currently OVERDUE. */
  overdueMs: number | null;
}

/**
 * Pure SLA calculation. The deadline itself is fixed at exception-creation time (see the
 * reconciliation engine) and never recalculated here — only the *state* relative to `now`
 * (or the closure instant, once closed) changes.
 */
export function calculateSlaState(params: {
  slaDeadline: Date | null;
  closedAt: Date | null;
  now: Date;
}): SlaAssessment {
  const { slaDeadline, closedAt, now } = params;

  if (!slaDeadline) {
    return { state: "ON_TRACK", remainingMs: null, overdueMs: null };
  }

  if (closedAt) {
    const isLate = closedAt.getTime() > slaDeadline.getTime();
    return { state: isLate ? "COMPLETED_LATE" : "COMPLETED_ON_TIME", remainingMs: null, overdueMs: null };
  }

  const remainingMs = slaDeadline.getTime() - now.getTime();
  if (remainingMs < 0) {
    return { state: "OVERDUE", remainingMs: null, overdueMs: -remainingMs };
  }

  const dueSoonThresholdMs = EXCEPTION_WORKFLOW_CONFIG.dueSoonThresholdHours * 60 * 60 * 1000;
  if (remainingMs <= dueSoonThresholdMs) {
    return { state: "DUE_SOON", remainingMs, overdueMs: null };
  }

  return { state: "ON_TRACK", remainingMs, overdueMs: null };
}
