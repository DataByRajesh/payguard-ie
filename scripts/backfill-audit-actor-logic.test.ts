import { describe, expect, it } from "vitest";
import { resolveActorUserId } from "./backfill-audit-actor-logic";

describe("resolveActorUserId", () => {
  const usersByName = new Map([
    ["Aisling Byrne", "user-aisling"],
    ["Conor Walsh", "user-conor"],
  ]);
  const systemUserId = "user-system";

  it("matches a legacy actor name to the corresponding user", () => {
    expect(resolveActorUserId("Aisling Byrne", usersByName, systemUserId)).toBe("user-aisling");
  });

  it("falls back to the service account for the historical SYSTEM placeholder", () => {
    expect(resolveActorUserId("SYSTEM", usersByName, systemUserId)).toBe(systemUserId);
  });

  it("falls back to the service account for a name that no longer matches any user", () => {
    expect(resolveActorUserId("Someone Deleted", usersByName, systemUserId)).toBe(systemUserId);
  });

  it("falls back to the service account for a null actor", () => {
    expect(resolveActorUserId(null, usersByName, systemUserId)).toBe(systemUserId);
  });
});
