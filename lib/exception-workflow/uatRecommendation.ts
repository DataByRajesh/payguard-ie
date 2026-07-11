export interface UatCounts {
  pass: number;
  fail: number;
  blocked: number;
  notRun: number;
}

export const RELEASE_RECOMMENDATIONS = ["READY", "NOT_READY", "CONDITIONAL"] as const;
export type ReleaseRecommendation = (typeof RELEASE_RECOMMENDATIONS)[number];

/**
 * Pure release-readiness recommendation from aggregate UAT execution counts.
 * Any failure blocks release outright; blocked or not-yet-run cases only downgrade
 * to a conditional recommendation, since they represent unknowns rather than known defects.
 */
export function computeReleaseRecommendation(counts: UatCounts): ReleaseRecommendation {
  if (counts.fail > 0) return "NOT_READY";
  if (counts.blocked > 0 || counts.notRun > 0) return "CONDITIONAL";
  return "READY";
}
