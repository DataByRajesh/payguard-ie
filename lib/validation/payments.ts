import { z } from "zod";
import { SETTLEMENT_DISPLAY_STATUSES } from "@/lib/reconciliation";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

export const PAYMENT_STATUS_VALUES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
] as const;

export const paymentsQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUS_VALUES).optional(),
  settlementStatus: z.enum(SETTLEMENT_DISPLAY_STATUSES).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  q: z.string().trim().max(100).optional(),
});

export type PaymentsQuery = z.infer<typeof paymentsQuerySchema>;

/** Parses raw searchParams into a validated query; unrecognised/invalid/empty values are dropped rather than rejected. */
export function parsePaymentsQuery(raw: Record<string, string | string[] | undefined>): PaymentsQuery {
  const normalized = Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  );
  const result = paymentsQuerySchema.safeParse(normalized);
  return result.success ? result.data : {};
}
