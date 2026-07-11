"use client";

import { useRef } from "react";
import {
  EXCEPTION_SEVERITY_VALUES,
  EXCEPTION_STATUS_VALUES,
  EXCEPTION_TYPE_VALUES,
} from "@/lib/validation/exceptions";
import { SLA_STATES, ROOT_CAUSE_CATEGORIES } from "@/lib/exception-workflow/types";
import {
  EXCEPTION_SEVERITY_PRESENTATION,
  EXCEPTION_STATUS_PRESENTATION,
  EXCEPTION_TYPE_PRESENTATION,
  ROOT_CAUSE_CATEGORY_LABELS,
  SLA_STATE_PRESENTATION,
} from "@/lib/status";
import type { ExceptionsQuery } from "@/lib/validation/exceptions";
import type { User } from "@/app/generated/prisma/client";

export function ExceptionsFilterBar({ defaultValues, users }: { defaultValues: ExceptionsQuery; users: User[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} method="GET" className="flex flex-wrap items-end gap-3" aria-label="Filter exceptions">
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-medium text-slate-600">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={defaultValues.type ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {EXCEPTION_TYPE_VALUES.map((type) => (
            <option key={type} value={type}>
              {EXCEPTION_TYPE_PRESENTATION[type].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="severity" className="text-xs font-medium text-slate-600">
          Severity
        </label>
        <select
          id="severity"
          name="severity"
          defaultValue={defaultValues.severity ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All severities</option>
          {EXCEPTION_SEVERITY_VALUES.map((severity) => (
            <option key={severity} value={severity}>
              {EXCEPTION_SEVERITY_PRESENTATION[severity].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-slate-600">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues.status ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {EXCEPTION_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {EXCEPTION_STATUS_PRESENTATION[status].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ownerId" className="text-xs font-medium text-slate-600">
          Owner
        </label>
        <select
          id="ownerId"
          name="ownerId"
          defaultValue={defaultValues.ownerId ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All owners</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 pb-1.5 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          name="unassigned"
          value="true"
          defaultChecked={defaultValues.unassigned === "true"}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-4 w-4 rounded border-slate-300"
        />
        Unassigned only
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="slaState" className="text-xs font-medium text-slate-600">
          SLA state
        </label>
        <select
          id="slaState"
          name="slaState"
          defaultValue={defaultValues.slaState ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          {SLA_STATES.map((state) => (
            <option key={state} value={state}>
              {SLA_STATE_PRESENTATION[state].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rootCause" className="text-xs font-medium text-slate-600">
          Root cause
        </label>
        <select
          id="rootCause"
          name="rootCause"
          defaultValue={defaultValues.rootCause ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All root causes</option>
          {ROOT_CAUSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ROOT_CAUSE_CATEGORY_LABELS[category]}
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
          placeholder="Case or payment reference"
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
