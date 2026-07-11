// Pure types for the reconciliation rule engine. Deliberately independent of
// the Prisma-generated enums (which this layer must never import) so rules
// stay portable and trivially unit-testable.

export const RULE_TYPES = [
  "MISSING_SETTLEMENT",
  "AMOUNT_MISMATCH",
  "CURRENCY_MISMATCH",
  "DUPLICATE_PAYMENT",
  "DELAYED_SETTLEMENT",
  "STUCK_PAYMENT",
  "INVALID_STATUS_COMBINATION",
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type PaymentStatusInput = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REVERSED";
export type SettlementStatusInput = "PENDING" | "SETTLED" | "FAILED" | "REVERSED";

export interface PaymentInput {
  id: string;
  customerId: string;
  paymentReference: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  status: PaymentStatusInput;
  createdAt: Date;
  expectedSettlementAt: Date;
}

export interface SettlementInput {
  id: string;
  amountMinor: number;
  currency: string;
  status: SettlementStatusInput;
  settledAt: Date | null;
}

export interface RuleContext {
  payment: PaymentInput;
  settlement: SettlementInput | null;
  /** Full payment set for the run, used by rules (e.g. duplicate detection) that need cross-payment context. */
  allPayments: PaymentInput[];
  now: Date;
}

interface RuleEvaluationBase {
  rule: RuleType;
  paymentId: string;
  settlementId: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationPassed extends RuleEvaluationBase {
  passed: true;
}

export interface RuleEvaluationFailed extends RuleEvaluationBase {
  passed: false;
  severity: Severity;
  expectedValue: string | null;
  actualValue: string | null;
  differenceMinor: number | null;
}

export type RuleEvaluation = RuleEvaluationPassed | RuleEvaluationFailed;
