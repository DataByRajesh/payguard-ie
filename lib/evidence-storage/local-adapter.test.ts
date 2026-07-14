import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { localEvidenceAdapter, LOCAL_EVIDENCE_DIR } from "./local-adapter";

/** Exercises the real filesystem against the project's own gitignored .data/evidence/ directory
 * (never mocked -- same "test the real thing" ethos as the Prisma-backed integration specs),
 * cleaning up the file it writes so repeated runs don't accumulate test artifacts. */
describe("localEvidenceAdapter", () => {
  const writtenPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(writtenPaths.splice(0).map((filePath) => rm(filePath, { force: true })));
  });

  it("writes a file to disk and returns metadata that can read it back", async () => {
    const content = "evidence file contents";
    const file = new File([content], "notes.txt", { type: "text/plain" });

    const stored = await localEvidenceAdapter.put(file);
    writtenPaths.push(path.join(LOCAL_EVIDENCE_DIR, stored.storageKey));

    expect(stored.provider).toBe("LOCAL");
    expect(stored.mimeType).toBe("text/plain");
    expect(stored.sizeBytes).toBe(content.length);
    expect(stored.storageKey).toMatch(/\.txt$/);

    const readBack = await readFile(path.join(LOCAL_EVIDENCE_DIR, stored.storageKey), "utf8");
    expect(readBack).toBe(content);
  });

  it("gives two uploads of the same filename distinct storage keys", async () => {
    const fileA = new File(["a"], "same-name.txt", { type: "text/plain" });
    const fileB = new File(["b"], "same-name.txt", { type: "text/plain" });

    const storedA = await localEvidenceAdapter.put(fileA);
    const storedB = await localEvidenceAdapter.put(fileB);
    writtenPaths.push(path.join(LOCAL_EVIDENCE_DIR, storedA.storageKey), path.join(LOCAL_EVIDENCE_DIR, storedB.storageKey));

    expect(storedA.storageKey).not.toBe(storedB.storageKey);
  });

  it("falls back to a generic MIME type when the file has none", async () => {
    const file = new File(["data"], "unknown-extension");
    const stored = await localEvidenceAdapter.put(file);
    writtenPaths.push(path.join(LOCAL_EVIDENCE_DIR, stored.storageKey));

    expect(stored.mimeType).toBe("application/octet-stream");
  });
});
