// Explicit timeZone so displayed timestamps (including SLA deadlines) are stable regardless of
// the host machine/container's configured timezone — without this, Intl.DateTimeFormat falls
// back to the runtime's local timezone, which would silently differ between a developer's
// machine and a UTC-default deployment container.
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Dublin",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "Europe/Dublin",
});

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_FORMATTER.format(new Date(value));
}
