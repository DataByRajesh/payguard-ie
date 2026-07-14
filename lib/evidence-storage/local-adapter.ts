import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvidenceStorageAdapter, StoredEvidenceFile } from "./types";

/** Gitignored, local-only -- the dev/CI/self-hosted default. Never used for the public Vercel
 * demo, whose filesystem is ephemeral per-request anyway (see docs/CLOUD_DEPLOYMENT.md). */
export const LOCAL_EVIDENCE_DIR = path.resolve(process.cwd(), ".data", "evidence");

export const localEvidenceAdapter: EvidenceStorageAdapter = {
  async put(file: File): Promise<StoredEvidenceFile> {
    await mkdir(LOCAL_EVIDENCE_DIR, { recursive: true });
    const storageKey = `${randomUUID()}${path.extname(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(LOCAL_EVIDENCE_DIR, storageKey), buffer);
    return {
      provider: "LOCAL",
      storageKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
    };
  },
};
