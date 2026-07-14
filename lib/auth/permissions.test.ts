import { describe, expect, it } from "vitest";
import { hasPermission, requirePermission, USER_ROLES, type Permission } from "./permissions";

const ALL_PERMISSIONS: Permission[] = [
  "EXCEPTION_ASSIGN",
  "EXCEPTION_TRANSITION",
  "EXCEPTION_NOTE",
  "EXCEPTION_ROOT_CAUSE",
  "EXCEPTION_RESOLVE",
  "EXCEPTION_REVIEW",
  "EXCEPTION_EVIDENCE",
  "RECONCILIATION_RUN",
  "UAT_EXECUTE",
  "UAT_EVIDENCE",
  "USER_MANAGE",
];

// The full role x permission matrix, matching the plan's permission table exactly. Table-driven
// so every combination is asserted explicitly and any future change to the matrix is visible as a
// one-line diff here.
const EXPECTED: Record<string, Set<Permission>> = {
  OPS_ANALYST: new Set([
    "EXCEPTION_ASSIGN",
    "EXCEPTION_TRANSITION",
    "EXCEPTION_NOTE",
    "EXCEPTION_ROOT_CAUSE",
    "EXCEPTION_RESOLVE",
    "EXCEPTION_REVIEW",
    "EXCEPTION_EVIDENCE",
    "RECONCILIATION_RUN",
  ]),
  APP_SUPPORT: new Set(["EXCEPTION_NOTE", "EXCEPTION_EVIDENCE", "UAT_EXECUTE", "UAT_EVIDENCE"]),
  UAT_LEAD: new Set(["EXCEPTION_NOTE", "EXCEPTION_EVIDENCE", "UAT_EXECUTE", "UAT_EVIDENCE"]),
  ADMIN: new Set(ALL_PERMISSIONS),
};

describe("hasPermission", () => {
  it("has an expectation for every seeded role", () => {
    expect(new Set(USER_ROLES)).toEqual(new Set(Object.keys(EXPECTED)));
  });

  for (const role of Object.keys(EXPECTED)) {
    for (const permission of ALL_PERMISSIONS) {
      const expected = EXPECTED[role].has(permission);
      it(`${role} ${expected ? "can" : "cannot"} ${permission}`, () => {
        expect(hasPermission(role, permission)).toBe(expected);
      });
    }
  }

  it("denies an unknown role every permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("NOT_A_REAL_ROLE", permission)).toBe(false);
    }
  });
});

describe("requirePermission", () => {
  it("returns null when the actor's role has the permission", () => {
    expect(requirePermission({ role: "ADMIN" }, "USER_MANAGE")).toBeNull();
  });

  it("returns a failure ActionResult when the actor's role lacks the permission", () => {
    const result = requirePermission<{ success: boolean; message: string }>({ role: "UAT_LEAD" }, "EXCEPTION_REVIEW");
    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
    expect(result?.message).toMatch(/permission/i);
  });
});
