import { describe, expect, it } from "vitest";
import { computeReleaseRecommendation } from "./uatRecommendation";

describe("computeReleaseRecommendation", () => {
  it("is READY when everything has passed", () => {
    expect(computeReleaseRecommendation({ pass: 10, fail: 0, blocked: 0, notRun: 0 })).toBe("READY");
  });

  it("is NOT_READY when anything has failed, regardless of other counts", () => {
    expect(computeReleaseRecommendation({ pass: 9, fail: 1, blocked: 0, notRun: 0 })).toBe("NOT_READY");
  });

  it("is CONDITIONAL when some cases are blocked but none failed", () => {
    expect(computeReleaseRecommendation({ pass: 8, fail: 0, blocked: 2, notRun: 0 })).toBe("CONDITIONAL");
  });

  it("is CONDITIONAL when some cases have not been run yet", () => {
    expect(computeReleaseRecommendation({ pass: 8, fail: 0, blocked: 0, notRun: 2 })).toBe("CONDITIONAL");
  });

  it("prioritises NOT_READY over CONDITIONAL when both fail and blocked are present", () => {
    expect(computeReleaseRecommendation({ pass: 5, fail: 1, blocked: 1, notRun: 1 })).toBe("NOT_READY");
  });

  it("is CONDITIONAL for an entirely not-run suite", () => {
    expect(computeReleaseRecommendation({ pass: 0, fail: 0, blocked: 0, notRun: 5 })).toBe("CONDITIONAL");
  });
});
