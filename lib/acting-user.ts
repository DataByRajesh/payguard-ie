import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const ACTING_USER_COOKIE = "payguard_acting_user_id";

/** All active seeded users, for the demo acting-user selector and assignment dropdowns. */
export async function getAssignableUsers() {
  return prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

/**
 * The user the current demo session is "acting as". There is no authentication in this
 * project — every mutation is attributed to whichever seeded user is currently selected via
 * the acting-user selector in the app header, persisted in a plain cookie.
 */
export async function getActingUser() {
  const cookieStore = await cookies();
  const actingUserId = cookieStore.get(ACTING_USER_COOKIE)?.value;

  if (actingUserId) {
    const user = await prisma.user.findUnique({ where: { id: actingUserId } });
    if (user && user.isActive) return user;
  }

  // Fall back to the first active user so every action always has an attributable actor.
  const fallback = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { name: "asc" } });
  if (!fallback) {
    throw new Error("No active users are seeded — cannot attribute this action to anyone.");
  }
  return fallback;
}

export async function setActingUserCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTING_USER_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export { ACTING_USER_COOKIE };
