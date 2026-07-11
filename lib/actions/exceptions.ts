"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActingUser } from "@/lib/acting-user";
import {
  addNoteSchema,
  addExceptionEvidenceSchema,
  assignExceptionSchema,
  recordRootCauseSchema,
  reviewExceptionSchema,
  submitResolutionSchema,
  transitionExceptionSchema,
} from "@/lib/validation/exceptionWorkflow";
import { formDataToObject, mapWorkflowError, type ActionResult } from "./helpers";
import * as exceptionWorkflow from "@/lib/exception-workflow/service";

function revalidateExceptionPaths(exceptionId: string) {
  revalidatePath("/exceptions");
  revalidatePath(`/exceptions/${exceptionId}`);
  revalidatePath("/dashboard");
}

export async function assignExceptionAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = assignExceptionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    const assignee = await prisma.user.findUnique({ where: { id: input.assignToUserId } });
    if (!assignee || !assignee.isActive) {
      return { success: false, message: "The selected user is inactive or does not exist." };
    }

    await exceptionWorkflow.assignException(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      assignToUserId: input.assignToUserId,
      assignedByUserId: actor.id,
      assigneeName: assignee.name,
      note: input.note || null,
    });

    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: `Assigned to ${assignee.name}.` };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function startInvestigationAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = transitionExceptionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.startInvestigation(input.exceptionId, { expectedVersion: input.expectedVersion, now: new Date(), actorName: actor.name });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Investigation started." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function requestInformationAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = transitionExceptionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.requestInformation(input.exceptionId, { expectedVersion: input.expectedVersion, now: new Date(), actorName: actor.name });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Case marked as awaiting information." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function resumeInvestigationAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = transitionExceptionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.resumeInvestigation(input.exceptionId, { expectedVersion: input.expectedVersion, now: new Date(), actorName: actor.name });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Investigation resumed." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function addNoteAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = addNoteSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.addNoteToException(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      noteType: input.noteType,
      content: input.content,
      authorUserId: actor.id,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Note added." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function recordRootCauseAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = recordRootCauseSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.recordRootCause(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      rootCauseCategory: input.rootCauseCategory,
      rootCauseSummary: input.rootCauseSummary,
      identifiedByUserId: actor.id,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Root cause recorded." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function submitResolutionAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = submitResolutionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.submitResolution(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      resolutionAction: input.resolutionAction,
      resolutionSummary: input.resolutionSummary,
      resolutionUserId: actor.id,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Resolution submitted; awaiting approval." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function approveExceptionAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = reviewExceptionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.approveException(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      approverUserId: actor.id,
      approvalNote: input.approvalNote || null,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Case approved and closed." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function rejectExceptionAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = reviewExceptionSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.rejectException(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      approverUserId: actor.id,
      approvalNote: input.approvalNote || null,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Resolution rejected; case returned to investigation." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}

export async function addExceptionEvidenceAction(formData: FormData): Promise<ActionResult> {
  try {
    const input = addExceptionEvidenceSchema.parse(formDataToObject(formData));
    const actor = await getActingUser();
    await exceptionWorkflow.addEvidenceToException(input.exceptionId, {
      expectedVersion: input.expectedVersion,
      now: new Date(),
      actorName: actor.name,
      evidenceType: input.evidenceType,
      title: input.title,
      description: input.description || null,
      fileReference: input.fileReference || null,
      addedByUserId: actor.id,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, message: "Evidence added." };
  } catch (error) {
    return mapWorkflowError(error);
  }
}
