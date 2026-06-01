import { NextResponse } from "next/server";
import { getExportData } from "@/lib/dashboard-service";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const { type } = await params;
  const data = getExportData(type);

  if (format === "csv") {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) {
      return new NextResponse("", { headers: { "Content-Type": "text/csv" } });
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? "")).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=${type}.csv`,
      },
    });
  }

  return NextResponse.json({ type, format, data });
}
