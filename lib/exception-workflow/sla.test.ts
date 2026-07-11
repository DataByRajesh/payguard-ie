import { describe, expect, it } from "vitest";
import { calculateSlaState } from "./sla";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("calculateSlaState", () => {
  it("is ON_TRACK when no deadline is set", () => {
    const result = calculateSlaState({ slaDeadline: null, closedAt: null, now: NOW });
    expect(result.state).toBe("ON_TRACK");
  });

  it("is ON_TRACK when comfortably before the deadline", () => {
    const result = calculateSlaState({ slaDeadline: new Date("2026-06-16T12:00:00Z"), closedAt: null, now: NOW });
    expect(result.state).toBe("ON_TRACK");
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it("is DUE_SOON at the exact due-soon boundary (4h remaining)", () => {
    const result = calculateSlaState({ slaDeadline: new Date("2026-06-15T16:00:00Z"), closedAt: null, now: NOW });
    expect(result.state).toBe("DUE_SOON");
  });

  it("is ON_TRACK just outside the due-soon boundary", () => {
    const result = calculateSlaState({ slaDeadline: new Date("2026-06-15T16:00:01Z"), closedAt: null, now: NOW });
    expect(result.state).toBe("ON_TRACK");
  });

  it("is OVERDUE once the deadline has passed", () => {
    const result = calculateSlaState({ slaDeadline: new Date("2026-06-15T11:59:59Z"), closedAt: null, now: NOW });
    expect(result.state).toBe("OVERDUE");
    expect(result.overdueMs).toBeGreaterThan(0);
  });

  it("is COMPLETED_ON_TIME when closed before the deadline", () => {
    const result = calculateSlaState({
      slaDeadline: new Date("2026-06-16T00:00:00Z"),
      closedAt: new Date("2026-06-15T18:00:00Z"),
      now: NOW,
    });
    expect(result.state).toBe("COMPLETED_ON_TIME");
  });

  it("is COMPLETED_LATE when closed after the deadline", () => {
    const result = calculateSlaState({
      slaDeadline: new Date("2026-06-14T00:00:00Z"),
      closedAt: new Date("2026-06-15T18:00:00Z"),
      now: NOW,
    });
    expect(result.state).toBe("COMPLETED_LATE");
  });

  it("does not change historical completion state based on `now`", () => {
    const closedAt = new Date("2026-06-10T00:00:00Z");
    const slaDeadline = new Date("2026-06-09T00:00:00Z");
    const a = calculateSlaState({ slaDeadline, closedAt, now: NOW });
    const b = calculateSlaState({ slaDeadline, closedAt, now: new Date("2030-01-01T00:00:00Z") });
    expect(a.state).toBe(b.state);
    expect(a.state).toBe("COMPLETED_LATE");
  });
});
