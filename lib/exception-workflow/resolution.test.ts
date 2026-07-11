import { describe, expect, it } from "vitest";
import { assessResolutionReadiness } from "./resolution";

function baseInput() {
  return {
    status: "INVESTIGATING" as const,
    assignedUserId: "user-1",
    rootCauseCategory: "SETTLEMENT_FILE_MISSING",
    rootCauseSummary: "Settlement provider confirmed the file was never generated for this batch.",
  };
}

describe("assessResolutionReadiness", () => {
  it("is ready when every requirement is met", () => {
    expect(assessResolutionReadiness(baseInput())).toEqual({ ready: true, reasons: [] });
  });

  it("is not ready when the case is not INVESTIGATING", () => {
    const result = assessResolutionReadiness({ ...baseInput(), status: "ASSIGNED" });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("INVESTIGATING"))).toBe(true);
  });

  it("is not ready without an assigned owner", () => {
    const result = assessResolutionReadiness({ ...baseInput(), assignedUserId: null });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("assigned owner"))).toBe(true);
  });

  it("is not ready without a root-cause category", () => {
    const result = assessResolutionReadiness({ ...baseInput(), rootCauseCategory: null });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("root-cause category"))).toBe(true);
  });

  it("is not ready with an empty root-cause summary", () => {
    const result = assessResolutionReadiness({ ...baseInput(), rootCauseSummary: "" });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("meaningful root-cause summary"))).toBe(true);
  });

  it("is not ready with a too-short root-cause summary", () => {
    const result = assessResolutionReadiness({ ...baseInput(), rootCauseSummary: "too short" });
    expect(result.ready).toBe(false);
  });

  it("accumulates multiple reasons at once", () => {
    const result = assessResolutionReadiness({
      status: "NEW",
      assignedUserId: null,
      rootCauseCategory: null,
      rootCauseSummary: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reasons.length).toBe(4);
  });
});
