import { NextResponse, type NextRequest } from "next/server";
import { getReportData } from "@/lib/reports/data";
import { toCsv, toHtml, toMarkdown } from "@/lib/reports/format";
import { REPORT_FORMATS, REPORT_TYPES, type ReportFormat, type ReportType } from "@/lib/reports/types";

function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

function isReportFormat(value: string): value is ReportFormat {
  return (REPORT_FORMATS as readonly string[]).includes(value);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isReportType(type)) {
    return NextResponse.json({ error: "Unknown report type." }, { status: 404 });
  }

  const formatParam = request.nextUrl.searchParams.get("format") ?? "markdown";
  if (!isReportFormat(formatParam)) {
    return NextResponse.json({ error: "Unknown report format." }, { status: 400 });
  }

  const table = await getReportData(type);
  const filenameBase = `${type}-report-${new Date().toISOString().slice(0, 10)}`;

  if (formatParam === "csv") {
    return new NextResponse(toCsv(table), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  if (formatParam === "html") {
    // Rendered inline (no attachment) so it opens as a print-friendly page — Ctrl/Cmd+P to save as PDF.
    return new NextResponse(toHtml(table), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(toMarkdown(table), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
    },
  });
}
