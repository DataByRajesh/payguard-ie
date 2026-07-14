import { prisma } from "@/lib/db";
import { getSessionCookie } from "@/lib/auth/session-cookie";
import { verifySession } from "@/lib/auth/session";

/** All active seeded users -- used by assignment dropdowns and (Phase 2.2) user-management UI. */
export async function getAssignableUsers() {
  return prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

/** The currently logged-in user, or `null` if there is no valid session. Never throws -- this is
 * what `AppShell` uses to decide whether to render the authenticated app chrome versus a bare
 * `/login` page. */
export async function getCurrentUserOrNull() {
  const cookieValue = await getSessionCookie();
  const userId = verifySession(cookieValue);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return user;
}

/** The currently logged-in user. `proxy.ts` already guarantees a valid session reaches every
 * protected route, so a missing/invalid session here is a genuine bug rather than something to
 * fall back from silently -- every Server Action that calls this runs only behind that guard. */
export async function getActingUser() {
  const user = await getCurrentUserOrNull();
  if (!user) {
    throw new Error("No valid session -- this should be unreachable behind proxy.ts.");
  }
  return user;
}
