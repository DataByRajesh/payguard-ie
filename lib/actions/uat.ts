"use server";

import { revalidatePath } from "next/cache";
import { getActingUser } from "@/lib/acting-user";
import { addUatEvidenceSchema, executeUatCaseSchema } from "@/lib/validation/uat";
import { executeUatCase, addUatEvidence } from "@/lib/uat-workflow/service";
import { formDataToObject, mapWorkflowError, type ActionResult } from "./helpers";

export async function executeUatCaseAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = executeUatCaseSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();

    const execution = await executeUatCase({
      testCaseId: input.testCaseId,
      status: input.status,
      actualResult: input.actualResult || null,
      notes: input.notes || null,
      testerUserId: actor.id,
      testerName: actor.name,
      linkedExceptionCaseId: input.linkedExceptionCaseId || null,
      now: new Date(),
    });

    revalidatePath("/uat");
    revalidatePath(`/uat/${input.testCaseId}`);
    revalidatePath("/dashboard");
    if (input.linkedExceptionCaseId) revalidatePath(`/exceptions/${input.linkedExceptionCaseId}`);

    return { success: true, message: `Execution recorded (${execution.status}).` };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function addUatEvidenceAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = addUatEvidenceSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();

    await addUatEvidence({
      executionId: input.executionId,
      evidenceType: input.evidenceType,
      title: input.title,
      description: input.description || null,
      fileReference: input.fileReference || null,
      addedByUserId: actor.id,
      actorName: actor.name,
      now: new Date(),
    });

    revalidatePath("/uat");
    return { success: true, message: "Evidence added." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}
