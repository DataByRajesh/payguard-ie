import { getEvidenceStorageAdapter } from "./adapter";
import { validateEvidenceFile } from "@/lib/validation/evidenceFile";
import type { StoredEvidenceFile } from "./types";

/** Server Actions natively accept a `File` entry via FormData -- no separate upload API route
 * needed. Returns null if no file was attached (evidence with only a text fileReference, or
 * neither, is still valid). Throws InvalidEvidenceFileError (caught by mapWorkflowError) if the
 * attached file fails size/type validation. */
export async function uploadEvidenceFileIfPresent(formData: FormData): Promise<StoredEvidenceFile | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  validateEvidenceFile(file);
  return getEvidenceStorageAdapter().put(file);
}
