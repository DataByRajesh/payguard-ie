export interface StoredEvidenceFile {
  provider: "LOCAL" | "VERCEL_BLOB";
  /** LOCAL: a flat filename under .data/evidence/. VERCEL_BLOB: the full public HTTPS URL Blob
   * already returns, stored directly rather than re-derived, since Blob URLs aren't guessable
   * from a key the way the local adapter's filenames are. */
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface EvidenceStorageAdapter {
  put(file: File): Promise<StoredEvidenceFile>;
}

/** Client-safe (no Node imports) so components can call it directly. LOCAL keys are served
 * through app/evidence/[...path]/route.ts; VERCEL_BLOB's storageKey is already the full public
 * HTTPS URL Blob returned at upload time. */
export function getEvidenceFileUrl(evidence: { storageProvider: string | null; storageKey: string | null }): string | null {
  if (!evidence.storageProvider || !evidence.storageKey) return null;
  return evidence.storageProvider === "VERCEL_BLOB" ? evidence.storageKey : `/evidence/${evidence.storageKey}`;
}
