/** Single source of truth for exception-workflow thresholds. */
export const EXCEPTION_WORKFLOW_CONFIG = {
  /** A case is DUE_SOON once its SLA deadline is within this many hours. */
  dueSoonThresholdHours: 4,
  /** Minimum trimmed length for a root-cause summary to count as "meaningful". */
  minRootCauseSummaryLength: 10,
} as const;
