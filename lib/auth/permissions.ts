/**
 * Cloud Phase 2.2 — role-based authorization. Cloud Phase 2.1 verified *who* is acting (a real,
 * logged-in `User`); this decides *whether that role is allowed to try* a given action. It does
 * NOT replace domain-level checks like reviewer separation (lib/exception-workflow/approval.ts)
 * -- a role passing this check can still have its attempt rejected by those, and no role bypasses
 * them, including ADMIN.
 */
export type Permission =
  | "EXCEPTION_ASSIGN"
  | "EXCEPTION_TRANSITION"
  | "EXCEPTION_NOTE"
  | "EXCEPTION_ROOT_CAUSE"
  | "EXCEPTION_RESOLVE"
  | "EXCEPTION_REVIEW"
  | "EXCEPTION_EVIDENCE"
  | "RECONCILIATION_RUN"
  | "UAT_EXECUTE"
  | "UAT_EVIDENCE"
  | "USER_MANAGE";

/** Derived from prisma/seed.ts's existing role/action affinities and the four roles already named
 * as a placeholder in app/settings/page.tsx. A product/policy default, not a technical constraint
 * -- easy to change since every check reads from this one map. */
const ROLE_PERMISSIONS: Readonly<Record<string, ReadonlySet<Permission>>> = {
  OPS_ANALYST: new Set<Permission>([
    "EXCEPTION_ASSIGN",
    "EXCEPTION_TRANSITION",
    "EXCEPTION_NOTE",
    "EXCEPTION_ROOT_CAUSE",
    "EXCEPTION_RESOLVE",
    "EXCEPTION_REVIEW",
    "EXCEPTION_EVIDENCE",
    "RECONCILIATION_RUN",
  ]),
  APP_SUPPORT: new Set<Permission>(["EXCEPTION_NOTE", "EXCEPTION_EVIDENCE", "UAT_EXECUTE", "UAT_EVIDENCE"]),
  UAT_LEAD: new Set<Permission>(["EXCEPTION_NOTE", "EXCEPTION_EVIDENCE", "UAT_EXECUTE", "UAT_EVIDENCE"]),
  ADMIN: new Set<Permission>([
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
  ]),
};

export const USER_ROLES = Object.keys(ROLE_PERMISSIONS) as [string, ...string[]];

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

const PERMISSION_DENIED_MESSAGE = "Your role does not have permission to perform this action.";

/** Same early-return guard-clause shape as demoReadOnlyResult() (lib/demo-mode.ts) -- returns a
 * failure result if the actor's role lacks the permission, or null if the caller should proceed. */
export function requirePermission<R extends { success: boolean; message: string }>(
  actor: { role: string },
  permission: Permission,
): R | null {
  if (hasPermission(actor.role, permission)) return null;
  return { success: false, message: PERMISSION_DENIED_MESSAGE } as R;
}
