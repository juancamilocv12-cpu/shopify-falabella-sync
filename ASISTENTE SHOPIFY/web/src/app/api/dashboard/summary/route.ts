import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard-service";

export async function GET() {
  return NextResponse.json(getDashboardSummary());
}
