import { localEvidenceAdapter } from "./local-adapter";
import { vercelBlobEvidenceAdapter } from "./vercel-blob-adapter";
import type { EvidenceStorageAdapter } from "./types";

export type { StoredEvidenceFile, EvidenceStorageAdapter } from "./types";
export { getEvidenceFileUrl } from "./types";

/** Unset means local -- same "unset = local default" convention as DATABASE_URL (lib/db.ts) and
 * DEMO_READ_ONLY (lib/demo-mode.ts). Set to "vercel-blob" on the public Preview/Production demo.
 *
 * Server-only (imports node:fs, @vercel/blob) -- Client Components needing a display URL for an
 * existing record should import getEvidenceFileUrl from ./types directly instead of through this
 * module, to avoid pulling server-only code into the client bundle. */
export function getEvidenceStorageAdapter(): EvidenceStorageAdapter {
  return process.env.EVIDENCE_STORAGE_PROVIDER === "vercel-blob" ? vercelBlobEvidenceAdapter : localEvidenceAdapter;
}
