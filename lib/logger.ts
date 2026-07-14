type LogLevel = "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

/** Vercel's log viewer (and any other stdout-based log collector) parses structured JSON lines
 * natively -- one JSON object per line is enough, no logging service dependency needed. */
function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  return { message: String(error) };
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const { error, ...rest } = fields;
  const payload: LogFields = {
    level,
    event,
    ts: new Date().toISOString(),
    ...rest,
  };
  if (error !== undefined) {
    payload.error = serializeError(error);
  }
  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
