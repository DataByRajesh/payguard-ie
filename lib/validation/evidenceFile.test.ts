import { describe, expect, it } from "vitest";
import { InvalidEvidenceFileError, MAX_EVIDENCE_FILE_BYTES, validateEvidenceFile } from "./evidenceFile";

describe("validateEvidenceFile", () => {
  it("accepts a small file with an allow-listed MIME type", () => {
    const file = new File(["hello"], "screenshot.png", { type: "image/png" });
    expect(() => validateEvidenceFile(file)).not.toThrow();
  });

  it("accepts a file with no MIME type at all", () => {
    const file = new File(["hello"], "unknown");
    expect(() => validateEvidenceFile(file)).not.toThrow();
  });

  it("rejects a file over the size cap", () => {
    const oversized = new File([new Uint8Array(MAX_EVIDENCE_FILE_BYTES + 1)], "big.png", { type: "image/png" });
    expect(() => validateEvidenceFile(oversized)).toThrow(InvalidEvidenceFileError);
  });

  it("rejects a MIME type that isn't on the allow-list", () => {
    const file = new File(["#!/bin/sh"], "script.sh", { type: "application/x-sh" });
    expect(() => validateEvidenceFile(file)).toThrow(InvalidEvidenceFileError);
  });
});
