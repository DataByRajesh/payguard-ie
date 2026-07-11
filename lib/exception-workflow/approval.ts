import type { ExceptionStatusValue, ReadinessResult } from "./types";

export interface ReviewInput {
  status: ExceptionStatusValue;
  resolutionUserId: string | null;
  reviewerUserId: string;
}

function assessReviewerSeparation(input: ReviewInput, reasons: string[]): void {
  if (input.status !== "RESOLVED") {
    reasons.push("Only RESOLVED cases can be reviewed.");
  }
  if (input.resolutionUserId && input.resolutionUserId === input.reviewerUserId) {
    reasons.push("The reviewer must be a different user from whoever resolved the case.");
  }
}

/** Approval additionally requires closure evidence, since approval directly closes the case. */
export function assessApprovalEligibility(input: ReviewInput & { evidenceCount: number }): ReadinessResult {
  const reasons: string[] = [];
  assessReviewerSeparation(input, reasons);
  if (input.evidenceCount < 1) {
    reasons.push("Closure requires at least one evidence record.");
  }
  return { ready: reasons.length === 0, reasons };
}

/** Rejection returns the case to INVESTIGATING — no closure, so no evidence requirement. */
export function assessRejectionEligibility(input: ReviewInput): ReadinessResult {
  const reasons: string[] = [];
  assessReviewerSeparation(input, reasons);
  return { ready: reasons.length === 0, reasons };
}
