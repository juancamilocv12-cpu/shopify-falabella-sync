import type {
  AlertItem,
  CollectionItem,
  DashboardSummary,
  DemandPlanningItem,
  InventoryItem,
  SalesItem,
  StrategyItem,
  VendorItem,
} from "@/types/dashboard";

type ShopifyOrderLine = {
  createdAt: string;
  quantity: number;
  sku: string;
  title: string;
  variantTitle: string;
  productId: string;
  vendor: string;
  productType: string;
  tags: string[];
  price: number;
};

type ShopifyVariantRow = {
  productId: string;
  productTitle: string;
  productType: string;
  vendor: string;
  tags: string[];
  collection: string;
  createdAt: string;
  variantId: string;
  variantTitle: string;
  sku: string;
  price: number;
  inventoryQuantity: number;
};

function getConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION ?? "2025-01";
  return { domain, token, apiVersion };
}

export function isShopifyConfigured() {
  const { domain, token } = getConfig();
  return Boolean(domain && token);
}

async function shopifyGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { domain, token, apiVersion } = getConfig();
  if (!domain || !token) {
    throw new Error("Shopify no configurado. Define SHOPIFY_STORE_DOMAIN y SHOPIFY_ACCESS_TOKEN en web/.env.local");
  }

  const response = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify HTTP ${response.status}: ${text}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join(" | ")}`);
  }
  if (!json.data) {
    throw new Error("Shopify GraphQL sin data");
  }
  return json.data;
}

async function fetchProducts(): Promise<ShopifyVariantRow[]> {
  const query = `
    query Products($first: Int!, $after: String) {
      products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          productType
          vendor
          tags
          createdAt
          collections(first: 20) {
            nodes {
              title
            }
          }
          variants(first: 100) {
            nodes {
              id
              title
              sku
              price
              inventoryQuantity
            }
          }
        }
      }
    }
  `;

  const rows: ShopifyVariantRow[] = [];

  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const data = await shopifyGraphql<{
      products: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        nodes: Array<{
          id: string;
          title: string;
          productType: string;
          vendor: string;
          tags: string[];
          createdAt: string;
          collections: { nodes: Array<{ title: string }> };
          variants: {
            nodes: Array<{
              id: string;
              title: string;
              sku: string;
              price: string;
              inventoryQuantity: number | null;
            }>;
          };
        }>;
      };
    }>(query, { first: 100, after });

    for (const product of data.products.nodes) {
      const collection = product.collections.nodes[0]?.title ?? "Sin coleccion";
      for (const variant of product.variants.nodes) {
        rows.push({
          productId: product.id,
          productTitle: product.title,
          productType: product.productType || "General",
          vendor: product.vendor || "Sin vendor",
          tags: product.tags ?? [],
          collection,
          createdAt: product.createdAt,
          variantId: variant.id,
          variantTitle: variant.title,
          sku: variant.sku || `${product.id}-${variant.id}`,
          price: Number(variant.price || 0),
          inventoryQuantity: variant.inventoryQuantity ?? 0,
        });
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor;
  }

  return rows;
}

async function fetchOrderLines(): Promise<ShopifyOrderLine[]> {
  const query = `
    query Orders($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          createdAt
          lineItems(first: 100) {
            nodes {
              quantity
              sku
              title
              variantTitle
              variant {
                id
                sku
                price
              }
              product {
                id
                vendor
                productType
                tags
              }
            }
          }
        }
      }
    }
  `;

  const since = new Date();
  since.setDate(since.getDate() - 180);
  const queryFilter = `created_at:>=${since.toISOString().slice(0, 10)} status:any`;

  const lines: ShopifyOrderLine[] = [];

  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const data = await shopifyGraphql<{
      orders: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        nodes: Array<{
          createdAt: string;
          lineItems: {
            nodes: Array<{
              quantity: number;
              sku: string | null;
              title: string;
              variantTitle: string | null;
              variant: { id: string; sku: string | null; price: string | null } | null;
              product: { id: string; vendor: string; productType: string; tags: string[] } | null;
            }>;
          };
        }>;
      };
    }>(query, { first: 100, after, query: queryFilter });

    for (const order of data.orders.nodes) {
      for (const line of order.lineItems.nodes) {
        if (!line.product) continue;
        const sku = line.sku || line.variant?.sku || `${line.product.id}-${line.title}`;
        lines.push({
          createdAt: order.createdAt,
          quantity: line.quantity,
          sku,
          title: line.title,
          variantTitle: line.variantTitle || "Default",
          productId: line.product.id,
          vendor: line.product.vendor || "Sin vendor",
          productType: line.product.productType || "General",
          tags: line.product.tags ?? [],
          price: Number(line.variant?.price || 0),
        });
      }
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    after = data.orders.pageInfo.endCursor;
  }

  return lines;
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.max(1, Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (1000 * 60 * 60 * 24)));
}

export async function buildDashboardDataFromShopify() {
  const [products, orderLines] = await Promise.all([fetchProducts(), fetchOrderLines()]);
  const now = new Date();

  const salesBySku = new Map<string, { s7: number; s30: number; s90: number; s180: number; r30: number; r90: number }>();
  for (const line of orderLines) {
    const age = daysBetween(line.createdAt, now.toISOString());
    const item = salesBySku.get(line.sku) ?? { s7: 0, s30: 0, s90: 0, s180: 0, r30: 0, r90: 0 };
    if (age <= 7) item.s7 += line.quantity;
    if (age <= 30) {
      item.s30 += line.quantity;
      item.r30 += line.quantity * line.price;
    }
    if (age <= 90) {
      item.s90 += line.quantity;
      item.r90 += line.quantity * line.price;
    }
    if (age <= 180) item.s180 += line.quantity;
    salesBySku.set(line.sku, item);
  }

  const inventoryData: InventoryItem[] = products.map((row, idx) => {
    const sales = salesBySku.get(row.sku) ?? { s7: 0, s30: 0, s90: 0, s180: 0, r30: 0, r90: 0 };
    const dailyDemand = sales.s90 / 90;
    const min = Math.max(15, Math.ceil(dailyDemand * 15 * 1.2));
    const reorder = Math.max(15, Math.ceil(dailyDemand * 15 * 1.2 + dailyDemand * 5));
    const days = dailyDemand > 0 ? Number((row.inventoryQuantity / dailyDemand).toFixed(1)) : row.inventoryQuantity > 0 ? 999 : 0;
    const months = Number((days / 30).toFixed(2));
    const status: InventoryItem["inventoryStatus"] =
      row.inventoryQuantity === 0
        ? "stockout"
        : row.inventoryQuantity < min
          ? "risk"
          : row.inventoryQuantity < reorder
            ? "attention"
            : months > 4
              ? "overstock"
              : "healthy";

    return {
      id: `inv-${idx + 1}`,
      productId: row.productId,
      product: row.productTitle,
      variant: row.variantTitle,
      sku: row.sku,
      collection: row.collection,
      vendor: row.vendor,
      productType: row.productType,
      tags: row.tags,
      location: "Principal",
      currentStock: row.inventoryQuantity,
      availableStock: row.inventoryQuantity,
      committedStock: 0,
      incomingStock: 0,
      minimumRequiredStock: min,
      reorderPoint: reorder,
      daysOfInventory: days,
      monthsOfInventory: months,
      inventoryStatus: status,
      lastSyncAt: now.toISOString(),
    };
  });

  const salesData: SalesItem[] = products.map((row, idx) => {
    const sales = salesBySku.get(row.sku) ?? { s7: 0, s30: 0, s90: 0, s180: 0, r30: 0, r90: 0 };
    return {
      id: `sale-${idx + 1}`,
      product: row.productTitle,
      sku: row.sku,
      collection: row.collection,
      vendor: row.vendor,
      sales7: sales.s7,
      sales30: sales.s30,
      sales90: sales.s90,
      sales180: sales.s180,
      revenue30: Number(sales.r30.toFixed(2)),
      revenue90: Number(sales.r90.toFixed(2)),
      trend: sales.s30 > sales.s90 / 3 ? "growing" : sales.s30 < sales.s90 / 5 ? "declining" : "stable",
      stock: row.inventoryQuantity,
    };
  });

  const demandPlanningData: DemandPlanningItem[] = inventoryData.map((inv, i) => {
    const sale = salesData[i];
    const monthlyDemand = Math.max(1, Number((sale.sales90 / 3).toFixed(1)));
    const targetStock = Math.max(15, Math.ceil(monthlyDemand * 2.2));
    const suggestedQty = Math.max(0, targetStock - inv.availableStock - inv.incomingStock);
    const roundedQty = Math.ceil(suggestedQty / 6) * 6;
    const coverage = Number((inv.availableStock / monthlyDemand).toFixed(2));
    const stockoutRisk: DemandPlanningItem["stockoutRisk"] =
      inv.availableStock < inv.reorderPoint ? "high" : coverage < 1.5 ? "medium" : "low";

    return {
      id: `dp-${i + 1}`,
      product: inv.product,
      variant: inv.variant,
      sku: inv.sku,
      vendor: inv.vendor,
      collection: inv.collection,
      stockCurrent: inv.currentStock,
      sales30: sale.sales30,
      sales90: sale.sales90,
      monthlyDemand,
      monthsCoverage: coverage,
      minimumRequiredStock: inv.minimumRequiredStock,
      reorderPoint: inv.reorderPoint,
      targetStock,
      suggestedQty,
      roundedQty,
      stockoutRisk,
      trend: sale.trend,
      recommendation:
        roundedQty > 0
          ? inv.availableStock === 0
            ? "stockout_with_demand"
            : inv.availableStock < inv.minimumRequiredStock
              ? "minimum_stock_required"
              : "urgent_reorder"
          : inv.inventoryStatus === "overstock"
            ? "do_not_buy"
            : "healthy_stock",
      priority: stockoutRisk === "high" ? "high" : roundedQty > 0 ? "medium" : "none",
      status: "pending",
      reason:
        roundedQty > 0
          ? `Demanda y cobertura real Shopify sugieren comprar ${roundedQty} unidades.`
          : "Cobertura suficiente o exceso de inventario.",
      recommendedAt: inv.lastSyncAt,
    };
  });

  const collectionsMap = new Map<string, CollectionItem>();
  for (const inv of inventoryData) {
    const sale = salesData.find((s) => s.sku === inv.sku)!;
    const current = collectionsMap.get(inv.collection) ?? {
      id: `col-${inv.collection}`,
      name: inv.collection,
      products: 0,
      stockTotal: 0,
      sales30: 0,
      sales90: 0,
      inventoryValue: 0,
      lowRotation: 0,
      overstock: 0,
      stockoutRisk: 0,
      strategy: "Optimizar mix por demanda",
    };
    current.products += 1;
    current.stockTotal += inv.availableStock;
    current.sales30 += sale.sales30;
    current.sales90 += sale.sales90;
    current.inventoryValue += inv.availableStock * 50000;
    if (inv.monthsOfInventory > 4) current.lowRotation += 1;
    if (inv.inventoryStatus === "overstock") current.overstock += 1;
    if (inv.inventoryStatus === "risk" || inv.inventoryStatus === "stockout") current.stockoutRisk += 1;
    collectionsMap.set(inv.collection, current);
  }
  const collectionsData = Array.from(collectionsMap.values());

  const vendorsMap = new Map<string, VendorItem>();
  for (const inv of inventoryData) {
    const sale = salesData.find((s) => s.sku === inv.sku)!;
    const current = vendorsMap.get(inv.vendor) ?? {
      vendor: inv.vendor,
      activeProducts: 0,
      stockTotal: 0,
      sales30: 0,
      sales90: 0,
      inventoryValue: 0,
      lowRotationProducts: 0,
      reorderProducts: 0,
      overstockProducts: 0,
      recommendation: "Ajustar compra por cobertura y lead time real",
    };
    current.activeProducts += 1;
    current.stockTotal += inv.availableStock;
    current.sales30 += sale.sales30;
    current.sales90 += sale.sales90;
    current.inventoryValue += inv.availableStock * 50000;
    if (inv.monthsOfInventory > 4) current.lowRotationProducts += 1;
    if (inv.availableStock < inv.reorderPoint) current.reorderProducts += 1;
    if (inv.inventoryStatus === "overstock") current.overstockProducts += 1;
    vendorsMap.set(inv.vendor, current);
  }
  const vendorsData = Array.from(vendorsMap.values());

  const strategyData: StrategyItem[] = demandPlanningData.slice(0, 50).map((d, i) => ({
    id: `st-${i + 1}`,
    scope: `${d.product} / ${d.collection}`,
    strategyType: d.roundedQty > 0 ? "reorder_before_ads" : d.recommendation === "do_not_buy" ? "liquidation" : "promotion",
    diagnosis: d.reason,
    action: d.roundedQty > 0 ? "Reabastecer antes de invertir en pauta" : "Aplicar estrategia comercial selectiva",
    channel: d.roundedQty > 0 ? "CRM" : "Meta Ads",
    discountPct: d.recommendation === "do_not_buy" ? 20 : 10,
    message: `Accion sugerida para ${d.product}`,
    durationDays: 10,
    priority: d.priority,
    confidence: 0.73,
    expectedImpact: d.priority === "high" ? "high" : "medium",
    risk: d.stockoutRisk,
    status: "pending",
  }));

  const alertData: AlertItem[] = demandPlanningData.slice(0, 80).map((d, i) => ({
    id: `al-${i + 1}`,
    alert: d.stockCurrent === 0 ? "Producto agotado" : d.stockoutRisk === "high" ? "Riesgo de agotado" : "Cobertura por revisar",
    product: d.product,
    sku: d.sku,
    type: d.stockCurrent === 0 ? "stockout" : d.recommendation === "do_not_buy" ? "overstock" : "inventory",
    priority: d.priority,
    createdAt: now.toISOString(),
    status: "open",
    reason: d.reason,
    suggestedAction: d.roundedQty > 0 ? "Crear orden de compra" : "Enviar a estrategia comercial",
  }));

  const dashboardSummary: DashboardSummary = {
    totalActiveProducts: inventoryData.length,
    totalVariants: inventoryData.length,
    estimatedInventoryValue: inventoryData.reduce((acc, cur) => acc + cur.availableStock * 50000, 0),
    salesLast30Days: salesData.reduce((acc, cur) => acc + cur.revenue30, 0),
    unitsSoldLast30Days: salesData.reduce((acc, cur) => acc + cur.sales30, 0),
    stockouts: inventoryData.filter((x) => x.inventoryStatus === "stockout").length,
    lowRotation: inventoryData.filter((x) => x.monthsOfInventory > 4).length,
    noSales: salesData.filter((x) => x.sales90 === 0).length,
    stockoutRisk: demandPlanningData.filter((x) => x.stockoutRisk === "high").length,
    overstock: inventoryData.filter((x) => x.inventoryStatus === "overstock").length,
    urgentReorder: demandPlanningData.filter((x) => x.roundedQty > 0).length,
    pendingStrategies: strategyData.filter((x) => x.status === "pending").length,
    openAlerts: alertData.filter((x) => x.status === "open").length,
    executiveSummary: [
      `Hay ${demandPlanningData.filter((x) => x.stockCurrent < x.minimumRequiredStock).length} productos bajo el inventario minimo de 15 unidades.`,
      `${demandPlanningData.filter((x) => x.stockoutRisk === "high").length} SKUs tienen riesgo alto de agotarse.`,
      `Se recomienda recomprar ${demandPlanningData.reduce((acc, cur) => acc + cur.roundedQty, 0)} unidades en ${demandPlanningData.filter((x) => x.roundedQty > 0).length} SKUs.`,
      `Hay ${inventoryData.filter((x) => x.inventoryStatus === "overstock").length} productos con sobrestock para rotacion.`,
      `No se recomienda pautar ${strategyData.filter((x) => x.strategyType === "reorder_before_ads").length} productos hasta reabastecer.`,
      `La coleccion ${collectionsData.sort((a, b) => b.inventoryValue - a.inventoryValue)[0]?.name ?? "N/A"} concentra mayor valor de inventario.`,
    ],
  };

  return {
    inventoryData,
    salesData,
    demandPlanningData,
    strategyData,
    alertData,
    collectionsData,
    vendorsData,
    dashboardSummary,
  };
}
