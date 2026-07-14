import { z } from "zod";
import { ConcurrencyConflictError } from "@/lib/exception-workflow/persistence";
import { DomainValidationError, ExceptionNotFoundError } from "@/lib/exception-workflow/service";
import { InvalidTransitionError } from "@/lib/exception-workflow/stateMachine";
import { InvalidEvidenceFileError } from "@/lib/validation/evidenceFile";

export interface ActionResult {
  success: boolean;
  message: string;
}

export function formDataToObject(formData: FormData): Record<string, string> {
  return Object.fromEntries(formData.entries()) as Record<string, string>;
}

/** Maps every known workflow error type to a user-facing message; logs and generalizes the rest. */
export function mapWorkflowError(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return { success: false, message: error.issues.map((issue) => issue.message).join(" ") };
  }
  if (error instanceof ConcurrencyConflictError) {
    return { success: false, message: error.message };
  }
  if (error instanceof DomainValidationError) {
    return { success: false, message: error.reasons.join(" ") };
  }
  if (error instanceof InvalidTransitionError) {
    return { success: false, message: error.message };
  }
  if (error instanceof ExceptionNotFoundError) {
    return { success: false, message: error.message };
  }
  if (error instanceof InvalidEvidenceFileError) {
    return { success: false, message: error.message };
  }
  console.error("Exception workflow action failed:", error);
  return { success: false, message: "Something went wrong. Check server logs for details." };
}
