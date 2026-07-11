import { evaluateMissingSettlement } from "./missingSettlement";
import { evaluateAmountMismatch } from "./amountMismatch";
import { evaluateCurrencyMismatch } from "./currencyMismatch";
import { evaluateDuplicatePayment } from "./duplicatePayment";
import { evaluateDelayedSettlement } from "./delayedSettlement";
import { evaluateStuckPayment } from "./stuckPayment";
import { evaluateInvalidStatusCombination } from "./invalidStatusCombination";
import type { RuleContext, RuleEvaluation } from "../types";

export {
  evaluateMissingSettlement,
  evaluateAmountMismatch,
  evaluateCurrencyMismatch,
  evaluateDuplicatePayment,
  evaluateDelayedSettlement,
  evaluateStuckPayment,
  evaluateInvalidStatusCombination,
};

/** Runs every reconciliation rule against a single payment/settlement context. */
export function evaluateAllRules(context: RuleContext): RuleEvaluation[] {
  return [
    evaluateMissingSettlement(context),
    evaluateAmountMismatch(context),
    evaluateCurrencyMismatch(context),
    evaluateDuplicatePayment(context),
    evaluateDelayedSettlement(context),
    evaluateStuckPayment(context),
    evaluateInvalidStatusCombination(context),
  ];
}
