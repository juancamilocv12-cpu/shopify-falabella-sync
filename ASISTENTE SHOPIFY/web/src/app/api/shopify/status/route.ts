import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/dashboard-service";
import { isShopifyConfigured } from "@/lib/shopify";

export async function GET() {
  return NextResponse.json({
    configured: isShopifyConfigured(),
    ...getSyncStatus(),
  });
}
