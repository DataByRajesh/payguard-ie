"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setActingUserCookie } from "@/lib/acting-user";
import type { ActionResult } from "./helpers";

const schema = z.object({ userId: z.string().trim().min(1) });

export async function setActingUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const { userId } = schema.parse({ userId: formData.get("userId") });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return { success: false, message: "That user is inactive or does not exist." };
    }
    await setActingUserCookie(userId);
    revalidatePath("/", "layout");
    return { success: true, message: `Now acting as ${user.name}.` };
  } catch (error) {
    console.error("setActingUserAction failed:", error);
    return { success: false, message: "Could not switch the acting user." };
  }
}
