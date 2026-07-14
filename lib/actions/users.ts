"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActingUser } from "@/lib/acting-user";
import { requirePermission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { createUserSchema, updateUserRoleSchema, setUserActiveSchema, resetUserPasswordSchema } from "@/lib/validation/users";
import { formDataToObject, mapWorkflowError, type ActionResult } from "./helpers";
import { isDemoReadOnly, demoReadOnlyResult } from "@/lib/demo-mode";

/** Every seeded/admin-created user shares one demo password (SEED_USER_PASSWORD, shown on
 * /login) so a reviewer can always sign in as any user regardless of who created them. */
function demoPasswordHash(): string {
  return hashPassword(process.env.SEED_USER_PASSWORD ?? "payguard-demo");
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  if (isDemoReadOnly()) return demoReadOnlyResult();
  try {
    const actor = await getActingUser();
    const denial = requirePermission<ActionResult>(actor, "USER_MANAGE");
    if (denial) return denial;

    const input = createUserSchema.parse(formDataToObject(formData));
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return { success: false, message: "A user with that email already exists." };
    }

    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, role: input.role, passwordHash: demoPasswordHash() },
    });

    revalidatePath("/settings");
    return { success: true, message: `Created ${user.name}. They can log in with the shared demo password.` };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function updateUserRoleAction(formData: FormData): Promise<ActionResult> {
  if (isDemoReadOnly()) return demoReadOnlyResult();
  try {
    const actor = await getActingUser();
    const denial = requirePermission<ActionResult>(actor, "USER_MANAGE");
    if (denial) return denial;

    const input = updateUserRoleSchema.parse(formDataToObject(formData));
    const user = await prisma.user.update({ where: { id: input.userId }, data: { role: input.role } });

    revalidatePath("/settings");
    return { success: true, message: `${user.name}'s role is now ${user.role.replace(/_/g, " ")}.` };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function setUserActiveAction(formData: FormData): Promise<ActionResult> {
  if (isDemoReadOnly()) return demoReadOnlyResult();
  try {
    const actor = await getActingUser();
    const denial = requirePermission<ActionResult>(actor, "USER_MANAGE");
    if (denial) return denial;

    const input = setUserActiveSchema.parse(formDataToObject(formData));
    const user = await prisma.user.update({ where: { id: input.userId }, data: { isActive: input.isActive } });

    revalidatePath("/settings");
    return { success: true, message: `${user.name} is now ${user.isActive ? "active" : "inactive"}.` };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function resetUserPasswordAction(formData: FormData): Promise<ActionResult> {
  if (isDemoReadOnly()) return demoReadOnlyResult();
  try {
    const actor = await getActingUser();
    const denial = requirePermission<ActionResult>(actor, "USER_MANAGE");
    if (denial) return denial;

    const input = resetUserPasswordSchema.parse(formDataToObject(formData));
    const user = await prisma.user.update({ where: { id: input.userId }, data: { passwordHash: demoPasswordHash() } });

    revalidatePath("/settings");
    return { success: true, message: `${user.name}'s password was reset to the shared demo password.` };
  } catch (error) {
    return mapWorkflowError(error);
  }
}
