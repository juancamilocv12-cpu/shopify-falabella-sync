import { NextResponse } from "next/server";
import { getVendorDetail } from "@/lib/dashboard-service";

export async function GET(_request: Request, { params }: { params: Promise<{ vendor: string }> }) {
  const { vendor } = await params;
  const found = getVendorDetail(decodeURIComponent(vendor));
  if (!found) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  return NextResponse.json(found);
}
