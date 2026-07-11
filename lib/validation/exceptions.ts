import { z } from "zod";
import { EXCEPTION_STATUSES, ROOT_CAUSE_CATEGORIES, SLA_STATES } from "@/lib/exception-workflow/types";

export const EXCEPTION_TYPE_VALUES = [
  "AMOUNT_MISMATCH",
  "CURRENCY_MISMATCH",
  "DUPLICATE_PAYMENT",
  "MISSING_SETTLEMENT",
  "DELAYED_SETTLEMENT",
  "SLA_BREACH",
  "INVALID_STATUS_COMBINATION",
] as const;

export const EXCEPTION_SEVERITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const EXCEPTION_STATUS_VALUES = EXCEPTION_STATUSES;

export const exceptionsQuerySchema = z.object({
  type: z.enum(EXCEPTION_TYPE_VALUES).optional(),
  severity: z.enum(EXCEPTION_SEVERITY_VALUES).optional(),
  status: z.enum(EXCEPTION_STATUS_VALUES).optional(),
  ownerId: z.string().trim().min(1).optional(),
  unassigned: z.literal("true").optional(),
  slaState: z.enum(SLA_STATES).optional(),
  rootCause: z.enum(ROOT_CAUSE_CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
});

export type ExceptionsQuery = z.infer<typeof exceptionsQuerySchema>;

/** Parses raw searchParams into a validated query; unrecognised/invalid/empty values are dropped rather than rejected. */
export function parseExceptionsQuery(raw: Record<string, string | string[] | undefined>): ExceptionsQuery {
  const normalized = Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  );
  const result = exceptionsQuerySchema.safeParse(normalized);
  return result.success ? result.data : {};
}
