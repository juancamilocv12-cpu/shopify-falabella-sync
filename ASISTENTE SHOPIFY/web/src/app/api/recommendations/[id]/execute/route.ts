import { NextResponse } from "next/server";
import { updateRecommendationStatus } from "@/lib/dashboard-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = updateRecommendationStatus(id, "executed");
  if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  return NextResponse.json(rec);
}
