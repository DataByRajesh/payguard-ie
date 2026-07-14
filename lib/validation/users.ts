import { z } from "zod";
import { USER_ROLES } from "@/lib/auth/permissions";

const idField = z.string().trim().min(1, "Required");

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  role: z.enum(USER_ROLES),
});

export const updateUserRoleSchema = z.object({
  userId: idField,
  role: z.enum(USER_ROLES),
});

export const setUserActiveSchema = z.object({
  userId: idField,
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const resetUserPasswordSchema = z.object({
  userId: idField,
});
