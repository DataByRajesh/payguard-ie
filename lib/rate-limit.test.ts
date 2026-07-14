import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "./rate-limit";

const WINDOW_MS = 60_000;

describe("checkRateLimit (integration)", () => {
  beforeEach(async () => {
    await prisma.rateLimitCounter.deleteMany();
  });

  it("allows calls up to the configured max within a window", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      expect(await checkRateLimit("user-1", "testAction", { max: 3, now })).toBeNull();
    }
  });

  it("blocks the call after the max is reached, within the same window", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("user-1", "testAction", { max: 3, now });
    }

    const result = await checkRateLimit("user-1", "testAction", { max: 3, now });
    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
    expect(result?.message).toMatch(/too often/i);
  });

  it("allows calls again once a new fixed window starts", async () => {
    const firstWindow = new Date("2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("user-1", "testAction", { max: 3, now: firstWindow });
    }
    expect(await checkRateLimit("user-1", "testAction", { max: 3, now: firstWindow })).not.toBeNull();

    const nextWindow = new Date(firstWindow.getTime() + WINDOW_MS);
    expect(await checkRateLimit("user-1", "testAction", { max: 3, now: nextWindow })).toBeNull();
  });

  it("tracks each user independently", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("user-1", "testAction", { max: 3, now });
    }
    expect(await checkRateLimit("user-1", "testAction", { max: 3, now })).not.toBeNull();
    expect(await checkRateLimit("user-2", "testAction", { max: 3, now })).toBeNull();
  });

  it("tracks each action independently for the same user", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("user-1", "actionA", { max: 3, now });
    }
    expect(await checkRateLimit("user-1", "actionA", { max: 3, now })).not.toBeNull();
    expect(await checkRateLimit("user-1", "actionB", { max: 3, now })).toBeNull();
  });
});
