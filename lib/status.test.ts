import { describe, expect, it } from "vitest";
import {
  ExceptionSeverity,
  ExceptionStatus,
  PaymentStatus,
  SettlementStatus,
  UATStatus,
} from "@/app/generated/prisma/enums";
import { SETTLEMENT_DISPLAY_STATUSES } from "@/lib/reconciliation";
import {
  EXCEPTION_SEVERITY_PRESENTATION,
  EXCEPTION_STATUS_PRESENTATION,
  PAYMENT_STATUS_PRESENTATION,
  SETTLEMENT_DISPLAY_STATUS_PRESENTATION,
  SETTLEMENT_STATUS_PRESENTATION,
  UAT_STATUS_PRESENTATION,
} from "@/lib/status";
import type { BadgeTone, StatusPresentation } from "@/lib/status";

const VALID_TONES: BadgeTone[] = ["neutral", "info", "success", "warning", "danger"];

function expectValidPresentation(presentation: StatusPresentation | undefined, value: string) {
  expect(presentation, `missing presentation config for "${value}"`).toBeDefined();
  expect(presentation!.label.length).toBeGreaterThan(0);
  expect(VALID_TONES).toContain(presentation!.tone);
}

describe("status presentation config", () => {
  it("has a label and valid tone for every PaymentStatus value", () => {
    for (const value of Object.values(PaymentStatus)) {
      expectValidPresentation(PAYMENT_STATUS_PRESENTATION[value], value);
    }
  });

  it("has a label and valid tone for every SettlementStatus value", () => {
    for (const value of Object.values(SettlementStatus)) {
      expectValidPresentation(SETTLEMENT_STATUS_PRESENTATION[value], value);
    }
  });

  it("has a label and valid tone for every derived SettlementDisplayStatus value", () => {
    for (const value of SETTLEMENT_DISPLAY_STATUSES) {
      expectValidPresentation(SETTLEMENT_DISPLAY_STATUS_PRESENTATION[value], value);
    }
  });

  it("has a label and valid tone for every ExceptionSeverity value", () => {
    for (const value of Object.values(ExceptionSeverity)) {
      expectValidPresentation(EXCEPTION_SEVERITY_PRESENTATION[value], value);
    }
  });

  it("has a label and valid tone for every ExceptionStatus value", () => {
    for (const value of Object.values(ExceptionStatus)) {
      expectValidPresentation(EXCEPTION_STATUS_PRESENTATION[value], value);
    }
  });

  it("has a label and valid tone for every UATStatus value", () => {
    for (const value of Object.values(UATStatus)) {
      expectValidPresentation(UAT_STATUS_PRESENTATION[value], value);
    }
  });
});
