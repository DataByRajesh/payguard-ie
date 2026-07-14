import { afterEach, describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

describe("signSession / verifySession", () => {
  const original = process.env.SESSION_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = original;
  });

  it("round-trips a valid session", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const cookieValue = signSession("user-123", now);
    expect(verifySession(cookieValue, now)).toBe("user-123");
  });

  it("returns null for a missing cookie value", () => {
    expect(verifySession(undefined)).toBeNull();
  });

  it("returns null for a malformed cookie value", () => {
    expect(verifySession("not-a-valid-cookie-value")).toBeNull();
  });

  it("returns null once the session has expired", () => {
    const issuedAt = new Date("2026-01-01T00:00:00.000Z");
    const cookieValue = signSession("user-123", issuedAt);
    const eightDaysLater = new Date(issuedAt.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(verifySession(cookieValue, eightDaysLater)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const cookieValue = signSession("user-123", now);
    const [encodedPayload, signature] = cookieValue.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "someone-else", issuedAt: now.getTime(), expiresAt: now.getTime() + 1000 })).toString(
      "base64url",
    );
    expect(verifySession(`${tamperedPayload}.${signature}`, now)).toBeNull();
    expect(encodedPayload).not.toBe(tamperedPayload);
  });

  it("rejects a cookie signed with a different secret", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    process.env.SESSION_SECRET = "secret-a";
    const cookieValue = signSession("user-123", now);
    process.env.SESSION_SECRET = "secret-b";
    expect(verifySession(cookieValue, now)).toBeNull();
  });
});
