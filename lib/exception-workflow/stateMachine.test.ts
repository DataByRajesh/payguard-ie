import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, InvalidTransitionError } from "./stateMachine";

describe("canTransition", () => {
  it.each([
    ["NEW", "ASSIGNED"],
    ["ASSIGNED", "INVESTIGATING"],
    ["INVESTIGATING", "AWAITING_INFORMATION"],
    ["AWAITING_INFORMATION", "INVESTIGATING"],
    ["INVESTIGATING", "RESOLVED"],
    ["RESOLVED", "CLOSED"],
    ["RESOLVED", "INVESTIGATING"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["NEW", "CLOSED"],
    ["ASSIGNED", "CLOSED"],
    ["INVESTIGATING", "CLOSED"],
    ["NEW", "INVESTIGATING"],
    ["NEW", "RESOLVED"],
    ["ASSIGNED", "RESOLVED"],
    ["AWAITING_INFORMATION", "RESOLVED"],
    ["CLOSED", "INVESTIGATING"],
    ["CLOSED", "NEW"],
  ] as const)("blocks %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("blocks direct closure from NEW, ASSIGNED or INVESTIGATING specifically", () => {
    expect(canTransition("NEW", "CLOSED")).toBe(false);
    expect(canTransition("ASSIGNED", "CLOSED")).toBe(false);
    expect(canTransition("INVESTIGATING", "CLOSED")).toBe(false);
  });

  it("has no outgoing transitions from CLOSED", () => {
    expect(canTransition("CLOSED", "NEW")).toBe(false);
    expect(canTransition("CLOSED", "ASSIGNED")).toBe(false);
    expect(canTransition("CLOSED", "INVESTIGATING")).toBe(false);
    expect(canTransition("CLOSED", "RESOLVED")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw for a valid transition", () => {
    expect(() => assertTransition("NEW", "ASSIGNED")).not.toThrow();
  });

  it("throws InvalidTransitionError for an invalid transition", () => {
    expect(() => assertTransition("NEW", "RESOLVED")).toThrow(InvalidTransitionError);
  });
});
