import type { ExceptionStatusValue } from "./types";

/**
 * The full exception lifecycle state machine. Direct closure from NEW/ASSIGNED/INVESTIGATING
 * is deliberately impossible — CLOSED is only reachable via RESOLVED, through approval.
 */
const ALLOWED_TRANSITIONS: Record<ExceptionStatusValue, readonly ExceptionStatusValue[]> = {
  NEW: ["ASSIGNED"],
  ASSIGNED: ["INVESTIGATING"],
  INVESTIGATING: ["AWAITING_INFORMATION", "RESOLVED"],
  AWAITING_INFORMATION: ["INVESTIGATING"],
  RESOLVED: ["CLOSED", "INVESTIGATING"],
  CLOSED: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ExceptionStatusValue,
    public readonly to: ExceptionStatusValue,
  ) {
    super(`Cannot transition an exception case from ${from} to ${to}.`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransition(from: ExceptionStatusValue, to: ExceptionStatusValue): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(from: ExceptionStatusValue): readonly ExceptionStatusValue[] {
  return ALLOWED_TRANSITIONS[from];
}

/** Throws InvalidTransitionError if the transition is not allowed; otherwise a no-op. */
export function assertTransition(from: ExceptionStatusValue, to: ExceptionStatusValue): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
