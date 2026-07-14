import { prisma } from "@/lib/db";

/** Every seeded user, active or not -- for the admin-only user-management table on /settings. */
export function getAllUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
