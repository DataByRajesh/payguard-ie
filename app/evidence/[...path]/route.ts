import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { LOCAL_EVIDENCE_DIR } from "@/lib/evidence-storage/local-adapter";

/**
 * Serves evidence files uploaded via the LOCAL storage adapter (dev/CI/self-hosted). The public
 * Preview/Production demo uses the Vercel Blob adapter instead, whose URLs are already public
 * HTTPS and never route through here. Protected like every other route by proxy.ts (a valid
 * session is required to reach this handler at all).
 *
 * Only serves a file if it's registered as an EvidenceRecord.storageKey — not just any file that
 * happens to sit in the local evidence directory — as a second layer of defense alongside the
 * path-segment check below.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const storageKey = segments[0];
  if (segments.length !== 1 || !storageKey || storageKey.includes("..") || storageKey.includes("/") || storageKey.includes("\\")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const record = await prisma.evidenceRecord.findFirst({ where: { storageKey, storageProvider: "LOCAL" } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readFile(path.join(LOCAL_EVIDENCE_DIR, storageKey));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": record.mimeType ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
