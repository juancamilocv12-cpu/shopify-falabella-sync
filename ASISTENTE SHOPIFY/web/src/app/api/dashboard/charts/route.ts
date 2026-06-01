import { NextResponse } from "next/server";
import { getDashboardCharts } from "@/lib/dashboard-service";

export async function GET() {
  return NextResponse.json(getDashboardCharts());
}
