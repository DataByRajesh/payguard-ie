import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

export const SETTLEMENT_STATUS_VALUES = ["PENDING", "SETTLED", "FAILED", "REVERSED"] as const;

export const settlementsQuerySchema = z.object({
  status: z.enum(SETTLEMENT_STATUS_VALUES).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  q: z.string().trim().max(100).optional(),
});

export type SettlementsQuery = z.infer<typeof settlementsQuerySchema>;

export function parseSettlementsQuery(raw: Record<string, string | string[] | undefined>): SettlementsQuery {
  const normalized = Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  );
  const result = settlementsQuerySchema.safeParse(normalized);
  return result.success ? result.data : {};
}
