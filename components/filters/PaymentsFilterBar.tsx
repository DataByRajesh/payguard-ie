"use client";

import { useRef } from "react";
import { PAYMENT_STATUS_VALUES } from "@/lib/validation/payments";
import { SETTLEMENT_DISPLAY_STATUSES } from "@/lib/reconciliation";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { PAYMENT_STATUS_PRESENTATION, SETTLEMENT_DISPLAY_STATUS_PRESENTATION } from "@/lib/status";
import type { PaymentsQuery } from "@/lib/validation/payments";

export function PaymentsFilterBar({ defaultValues }: { defaultValues: PaymentsQuery }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} method="GET" className="flex flex-wrap items-end gap-3" aria-label="Filter payments">
      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-slate-600">
          Payment status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues.status ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {PAYMENT_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS_PRESENTATION[status].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="settlementStatus" className="text-xs font-medium text-slate-600">
          Settlement status
        </label>
        <select
          id="settlementStatus"
          name="settlementStatus"
          defaultValue={defaultValues.settlementStatus ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All settlement statuses</option>
          {SETTLEMENT_DISPLAY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SETTLEMENT_DISPLAY_STATUS_PRESENTATION[status].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="currency" className="text-xs font-medium text-slate-600">
          Currency
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={defaultValues.currency ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All currencies</option>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="q" className="text-xs font-medium text-slate-600">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultValues.q ?? ""}
          placeholder="Payment or customer reference"
          className="w-64 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Apply
      </button>
    </form>
  );
}
