import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { AuditEvent, User } from "@/app/generated/prisma/client";

export function AuditTimeline({ events }: { events: (AuditEvent & { actorUser: User })[] }) {
  return (
    <Card title="Audit timeline">
      {events.length === 0 ? (
        <EmptyState title="No audit events" description="No audit trail has been recorded for this case." />
      ) : (
        <ul className="flex flex-col gap-3 border-l border-slate-200 pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span aria-hidden className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-slate-400" />
              <p className="text-sm font-medium text-slate-800">{event.summary}</p>
              <p className="text-xs text-slate-400">
                {formatDateTime(event.createdAt)} · {event.actorUser.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
