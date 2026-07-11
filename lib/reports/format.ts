import { formatDateTime } from "@/lib/format";
import type { ReportTable } from "./types";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** RFC 4180-ish escaping: wrap in quotes and double up any embedded quotes whenever needed. */
function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toMarkdown(table: ReportTable): string {
  const lines: string[] = [];
  lines.push(`# ${table.title}`, "");
  lines.push(table.description, "");
  lines.push(`_Generated ${formatDateTime(table.generatedAt)}_`, "");

  if (table.summary.length > 0) {
    for (const item of table.summary) {
      lines.push(`- **${item.label}**: ${item.value}`);
    }
    lines.push("");
  }

  lines.push(`| ${table.columns.join(" | ")} |`);
  lines.push(`| ${table.columns.map(() => "---").join(" | ")} |`);
  for (const row of table.rows) {
    lines.push(`| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`);
  }
  lines.push("");

  return lines.join("\n");
}

/** Purely tabular — the headline summary stats are omitted so every row has a uniform shape. */
export function toCsv(table: ReportTable): string {
  const lines: string[] = [];
  lines.push(table.columns.map(escapeCsvCell).join(","));
  for (const row of table.rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}

export function toHtml(table: ReportTable): string {
  const summaryHtml =
    table.summary.length > 0
      ? `<dl class="summary">${table.summary
          .map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`)
          .join("")}</dl>`
      : "";

  const headerHtml = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const rowsHtml = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(table.title)} — PayGuard IE</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; margin: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  p.description { color: #475569; margin-top: 0; }
  p.generated { color: #94a3b8; font-size: 0.8rem; }
  dl.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin: 1.5rem 0; padding: 0; }
  dl.summary div { border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem; }
  dl.summary dt { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin: 0; }
  dl.summary dd { font-size: 1.1rem; font-weight: 600; margin: 0.15rem 0 0; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
  th, td { border: 1px solid #e2e8f0; padding: 0.4rem 0.6rem; text-align: left; }
  th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; color: #475569; }
  @media print {
    body { margin: 0.5in; }
    dl.summary div { break-inside: avoid; }
    table { font-size: 10pt; }
  }
</style>
</head>
<body>
<h1>${escapeHtml(table.title)}</h1>
<p class="description">${escapeHtml(table.description)}</p>
<p class="generated">Generated ${escapeHtml(formatDateTime(table.generatedAt))} · PayGuard IE (synthetic demo data)</p>
${summaryHtml}
<table>
<thead><tr>${headerHtml}</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</body>
</html>
`;
}
