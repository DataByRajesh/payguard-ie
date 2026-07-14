import { put } from "@vercel/blob";
import type { EvidenceStorageAdapter, StoredEvidenceFile } from "./types";

/** The public Preview/Production demo's adapter -- Vercel's serverless filesystem is ephemeral
 * per-request, so evidence uploaded there must live somewhere durable. Requires
 * BLOB_READ_WRITE_TOKEN (auto-provisioned by Vercel once a Blob store is attached to the
 * project); see docs/CLOUD_DEPLOYMENT.md. */
export const vercelBlobEvidenceAdapter: EvidenceStorageAdapter = {
  async put(file: File): Promise<StoredEvidenceFile> {
    const blob = await put(file.name, file, { access: "public", addRandomSuffix: true });
    return {
      provider: "VERCEL_BLOB",
      storageKey: blob.url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  },
};
