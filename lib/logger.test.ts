import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function loggedPayload(): Record<string, unknown> {
    expect(logSpy).toHaveBeenCalledTimes(1);
    return JSON.parse(logSpy.mock.calls[0][0] as string);
  }

  it("emits a single valid JSON line with level, event and timestamp", () => {
    logger.info("user_logged_in", { userId: "abc123" });

    const payload = loggedPayload();
    expect(payload.level).toBe("info");
    expect(payload.event).toBe("user_logged_in");
    expect(payload.userId).toBe("abc123");
    expect(typeof payload.ts).toBe("string");
    expect(new Date(payload.ts as string).toString()).not.toBe("Invalid Date");
  });

  it("serializes an Error field into a message and stack", () => {
    logger.error("action_failed", { error: new Error("boom") });

    const payload = loggedPayload();
    expect(payload.level).toBe("error");
    const errorField = payload.error as { message: string; stack?: string };
    expect(errorField.message).toBe("boom");
    expect(errorField.stack).toContain("boom");
  });

  it("serializes a non-Error thrown value without throwing", () => {
    logger.error("action_failed", { error: "a plain string error" });

    const payload = loggedPayload();
    expect((payload.error as { message: string }).message).toBe("a plain string error");
  });

  it("works with no fields at all", () => {
    logger.warn("no_fields_event");

    const payload = loggedPayload();
    expect(payload.level).toBe("warn");
    expect(payload.event).toBe("no_fields_event");
  });
});
