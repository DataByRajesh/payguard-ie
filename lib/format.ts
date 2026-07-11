const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_FORMATTER.format(new Date(value));
}
