import { NextResponse } from "next/server";
import { buildDashboardDataFromShopify, isShopifyConfigured } from "@/lib/shopify";
import { hydrateDashboardState } from "@/lib/dashboard-service";

export async function POST() {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      {
        error: "Shopify no configurado. Define SHOPIFY_STORE_DOMAIN y SHOPIFY_ACCESS_TOKEN en web/.env.local",
      },
      { status: 400 },
    );
  }

  try {
    const data = await buildDashboardDataFromShopify();
    hydrateDashboardState(data);
    return NextResponse.json({
      success: true,
      products: data.inventoryData.length,
      salesRows: data.salesData.length,
      demandRows: data.demandPlanningData.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: `Error sincronizando Shopify: ${String(error)}` }, { status: 500 });
  }
}
