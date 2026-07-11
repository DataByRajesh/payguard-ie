import { z } from "zod";

/** Validates a route `[id]` param before it is used in a database lookup. */
export const idParamSchema = z.string().min(1);
