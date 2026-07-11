export const REPORT_TYPES = ["reconciliation", "exceptions", "uat", "payments"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FORMATS = ["markdown", "csv", "html"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface ReportTable {
  title: string;
  description: string;
  generatedAt: Date;
  /** Headline stats shown above the table — omitted from the CSV export, which stays purely tabular. */
  summary: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
}
