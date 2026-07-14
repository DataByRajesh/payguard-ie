import { afterEach, describe, expect, it } from "vitest";
import { demoReadOnlyResult, isDemoReadOnly } from "./demo-mode";

describe("isDemoReadOnly", () => {
  const original = process.env.DEMO_READ_ONLY;

  afterEach(() => {
    if (original === undefined) delete process.env.DEMO_READ_ONLY;
    else process.env.DEMO_READ_ONLY = original;
  });

  it("is false when DEMO_READ_ONLY is unset", () => {
    delete process.env.DEMO_READ_ONLY;
    expect(isDemoReadOnly()).toBe(false);
  });

  it("is false for any value other than the literal string 'true'", () => {
    process.env.DEMO_READ_ONLY = "1";
    expect(isDemoReadOnly()).toBe(false);
  });

  it("is true when DEMO_READ_ONLY is exactly 'true'", () => {
    process.env.DEMO_READ_ONLY = "true";
    expect(isDemoReadOnly()).toBe(true);
  });
});

describe("demoReadOnlyResult", () => {
  it("returns a failure result with a user-facing message", () => {
    const result = demoReadOnlyResult();
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/read-only demo/i);
  });
});
