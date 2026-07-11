import { describe, expect, it } from "vitest";
import { assessApprovalEligibility, assessRejectionEligibility } from "./approval";

describe("assessApprovalEligibility", () => {
  it("is ready when RESOLVED, reviewer differs from resolver, and evidence exists", () => {
    const result = assessApprovalEligibility({
      status: "RESOLVED",
      resolutionUserId: "resolver-1",
      reviewerUserId: "approver-1",
      evidenceCount: 1,
    });
    expect(result).toEqual({ ready: true, reasons: [] });
  });

  it("blocks approval of a case that is not RESOLVED", () => {
    const result = assessApprovalEligibility({
      status: "INVESTIGATING",
      resolutionUserId: "resolver-1",
      reviewerUserId: "approver-1",
      evidenceCount: 1,
    });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("RESOLVED"))).toBe(true);
  });

  it("blocks self-approval (resolver and approver must differ)", () => {
    const result = assessApprovalEligibility({
      status: "RESOLVED",
      resolutionUserId: "user-1",
      reviewerUserId: "user-1",
      evidenceCount: 1,
    });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("different user"))).toBe(true);
  });

  it("blocks approval without at least one evidence record", () => {
    const result = assessApprovalEligibility({
      status: "RESOLVED",
      resolutionUserId: "resolver-1",
      reviewerUserId: "approver-1",
      evidenceCount: 0,
    });
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes("evidence"))).toBe(true);
  });
});

describe("assessRejectionEligibility", () => {
  it("is ready when RESOLVED and reviewer differs from resolver", () => {
    const result = assessRejectionEligibility({
      status: "RESOLVED",
      resolutionUserId: "resolver-1",
      reviewerUserId: "approver-1",
    });
    expect(result).toEqual({ ready: true, reasons: [] });
  });

  it("does not require evidence to reject", () => {
    const result = assessRejectionEligibility({
      status: "RESOLVED",
      resolutionUserId: "resolver-1",
      reviewerUserId: "approver-1",
    });
    expect(result.ready).toBe(true);
  });

  it("blocks self-rejection", () => {
    const result = assessRejectionEligibility({
      status: "RESOLVED",
      resolutionUserId: "user-1",
      reviewerUserId: "user-1",
    });
    expect(result.ready).toBe(false);
  });

  it("blocks rejecting a case that is not RESOLVED", () => {
    const result = assessRejectionEligibility({
      status: "CLOSED",
      resolutionUserId: "resolver-1",
      reviewerUserId: "approver-1",
    });
    expect(result.ready).toBe(false);
  });
});
