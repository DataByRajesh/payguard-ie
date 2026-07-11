import type { Customer, Payment, Settlement } from "@/app/generated/prisma/client";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";

export interface PaymentListItem extends Payment {
  customer: Customer;
  settlement: Settlement | null;
  settlementDisplayStatus: SettlementDisplayStatus;
}

export interface SettlementListItem extends Settlement {
  payment: Payment & { customer: Customer };
}
