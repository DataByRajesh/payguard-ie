import { z } from "zod";
import { EVIDENCE_TYPES, EXCEPTION_NOTE_TYPES, RESOLUTION_ACTIONS, ROOT_CAUSE_CATEGORIES } from "@/lib/exception-workflow/types";

const idField = z.string().trim().min(1, "Required");
const versionField = z.coerce.number().int().min(1);

export const assignExceptionSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
  assignToUserId: idField,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const addNoteSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
  noteType: z.enum(EXCEPTION_NOTE_TYPES),
  content: z.string().trim().min(1, "Note content is required").max(4000),
});

export const recordRootCauseSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
  rootCauseCategory: z.enum(ROOT_CAUSE_CATEGORIES),
  rootCauseSummary: z.string().trim().min(10, "A meaningful root-cause summary is required (10+ characters).").max(2000),
});

export const submitResolutionSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
  resolutionAction: z.enum(RESOLUTION_ACTIONS),
  resolutionSummary: z.string().trim().min(10, "A meaningful resolution summary is required (10+ characters).").max(2000),
});

export const reviewExceptionSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
  approvalNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const addExceptionEvidenceSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
  evidenceType: z.enum(EVIDENCE_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  fileReference: z.string().trim().max(500).optional().or(z.literal("")),
});

export const transitionExceptionSchema = z.object({
  exceptionId: idField,
  expectedVersion: versionField,
});
