export const SUPPORTED_CURRENCIES = ["EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const PAYMENT_METHODS = [
  "SEPA_CREDIT_TRANSFER",
  "SEPA_DIRECT_DEBIT",
  "CARD",
  "FASTER_PAYMENTS",
  "SWIFT",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  SEPA_CREDIT_TRANSFER: "SEPA Credit Transfer",
  SEPA_DIRECT_DEBIT: "SEPA Direct Debit",
  CARD: "Card",
  FASTER_PAYMENTS: "Faster Payments",
  SWIFT: "SWIFT",
};
