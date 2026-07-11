import { z } from "zod";
import { EVIDENCE_TYPES, UAT_STATUSES } from "@/lib/exception-workflow/types";

const idField = z.string().trim().min(1, "Required");

export const executeUatCaseSchema = z.object({
  testCaseId: idField,
  status: z.enum(UAT_STATUSES),
  actualResult: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  linkedExceptionCaseId: z.string().trim().max(200).optional().or(z.literal("")),
});

export const addUatEvidenceSchema = z.object({
  executionId: idField,
  evidenceType: z.enum(EVIDENCE_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  fileReference: z.string().trim().max(500).optional().or(z.literal("")),
});
