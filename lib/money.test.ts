import { describe, expect, it } from "vitest";
import { formatMinorUnits, toMinorUnits } from "@/lib/money";

describe("formatMinorUnits", () => {
  it("formats EUR minor units with the euro symbol and two decimals", () => {
    expect(formatMinorUnits(123456, "EUR")).toBe("€1,234.56");
  });

  it("formats GBP minor units with the pound symbol", () => {
    expect(formatMinorUnits(50, "GBP")).toBe("£0.50");
  });

  it("formats zero", () => {
    expect(formatMinorUnits(0, "EUR")).toBe("€0.00");
  });

  it("formats negative amounts (e.g. reversals)", () => {
    expect(formatMinorUnits(-2599, "GBP")).toBe("-£25.99");
  });
});

describe("toMinorUnits", () => {
  it("converts a major-unit decimal to integer minor units", () => {
    expect(toMinorUnits(1234.56)).toBe(123456);
  });

  it("rounds floating point noise to the nearest minor unit", () => {
    expect(toMinorUnits(19.999999999999996)).toBe(2000);
  });

  it("converts zero", () => {
    expect(toMinorUnits(0)).toBe(0);
  });
});
