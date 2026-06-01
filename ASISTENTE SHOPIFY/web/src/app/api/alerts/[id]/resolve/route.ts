import { NextResponse } from "next/server";
import { resolveAlert } from "@/lib/dashboard-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert = resolveAlert(id);
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  return NextResponse.json(alert);
}
