import type { SupportedCurrency } from "@/lib/constants";

const CURRENCY_LOCALES: Record<SupportedCurrency, string> = {
  EUR: "en-IE",
  GBP: "en-GB",
};

/** Formats an integer minor-unit amount (e.g. cents) as a display string for the given currency. */
export function formatMinorUnits(
  amountMinor: number,
  currency: SupportedCurrency,
): string {
  const major = amountMinor / 100;
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
  }).format(major);
}

/** Converts a major-unit decimal amount (e.g. 1234.56) to integer minor units (123456). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
