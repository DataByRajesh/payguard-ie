export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
]);

export class InvalidEvidenceFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEvidenceFileError";
  }
}

/** Deliberately permissive about a missing/empty MIME type (some browsers omit it for certain
 * file types) -- only rejects a MIME type that's actually present and not in the allow-list. */
export function validateEvidenceFile(file: File): void {
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new InvalidEvidenceFileError(`File is too large (max ${MAX_EVIDENCE_FILE_BYTES / (1024 * 1024)}MB).`);
  }
  if (file.type && !ALLOWED_EVIDENCE_MIME_TYPES.has(file.type)) {
    throw new InvalidEvidenceFileError(`File type "${file.type}" is not supported.`);
  }
}
