import {
  AlertItem,
  CollectionItem,
  DashboardSummary,
  DemandPlanningItem,
  InventoryItem,
  QueryParams,
  SalesItem,
  StrategyItem,
  VendorItem,
  PaginatedResult,
} from "@/types/dashboard";

const locations = ["Bogota", "Medellin", "Cali"];
const collections = ["Running", "Basics", "Outdoor", "Premium", "Outlet"];
const vendors = ["Falabella Brand", "Andes Sport", "Urban Wave", "Nova Gear"];
const productTypes = ["Shoes", "Apparel", "Accessories"];

function deterministic(num: number): number {
  return Math.abs(Math.sin(num) * 10000);
}

export const inventoryData: InventoryItem[] = Array.from({ length: 84 }).map((_, i) => {
  const stock = Math.round(deterministic(i) % 180);
  const demand = Math.max(1, Math.round((deterministic(i + 20) % 36) + 1));
  const days = Number((stock / demand).toFixed(1));
  const months = Number((days / 30).toFixed(2));
  const min = 15 + Math.round(deterministic(i + 10) % 15);
  const reorder = min + 10;
  let inventoryStatus: InventoryItem["inventoryStatus"] = "healthy";
  if (stock === 0) inventoryStatus = "stockout";
  else if (stock < min) inventoryStatus = "risk";
  else if (stock < reorder) inventoryStatus = "attention";
  else if (months > 4) inventoryStatus = "overstock";

  return {
    id: `inv-${i + 1}`,
    productId: `prod-${i + 1}`,
    product: `Producto ${i + 1}`,
    variant: `Variante ${((i % 4) + 1).toString()}`,
    sku: `SKU-${String(i + 1).padStart(4, "0")}`,
    collection: collections[i % collections.length],
    vendor: vendors[i % vendors.length],
    productType: productTypes[i % productTypes.length],
    tags: i % 5 === 0 ? ["seasonal", "new"] : ["core"],
    location: locations[i % locations.length],
    currentStock: stock,
    availableStock: Math.max(0, stock - Math.round(deterministic(i + 2) % 8)),
    committedStock: Math.round(deterministic(i + 12) % 10),
    incomingStock: Math.round(deterministic(i + 21) % 30),
    minimumRequiredStock: min,
    reorderPoint: reorder,
    daysOfInventory: days,
    monthsOfInventory: months,
    inventoryStatus,
    lastSyncAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  };
});

export const salesData: SalesItem[] = inventoryData.map((inv, i) => {
  const sales30 = Math.round(deterministic(i + 100) % 160);
  const sales90 = sales30 * 2 + Math.round(deterministic(i + 33) % 70);
  const sales180 = sales90 + Math.round(deterministic(i + 44) % 120);
  const sales7 = Math.round(sales30 / 4);
  const trend = sales30 > sales90 / 3 ? "growing" : sales30 < sales90 / 5 ? "declining" : "stable";

  return {
    id: `sale-${i + 1}`,
    product: inv.product,
    sku: inv.sku,
    collection: inv.collection,
    vendor: inv.vendor,
    sales7,
    sales30,
    sales90,
    sales180,
    revenue30: sales30 * (45000 + (i % 5) * 10000),
    revenue90: sales90 * (42000 + (i % 5) * 10000),
    trend,
    stock: inv.availableStock,
  };
});

export const demandPlanningData: DemandPlanningItem[] = inventoryData.map((inv, i) => {
  const monthlyDemand = Math.max(1, Math.round((deterministic(i + 55) % 90) + 4));
  const targetStock = Math.max(15, Math.round(monthlyDemand * 2.2));
  const suggested = Math.max(0, targetStock - inv.availableStock - inv.incomingStock);
  const rounded = Math.ceil(suggested / 6) * 6;
  const coverage = Number((inv.availableStock / monthlyDemand).toFixed(2));
  const stockoutRisk = inv.availableStock < inv.reorderPoint ? "high" : coverage < 1.5 ? "medium" : "low";
  const trend = salesData[i].trend;
  const recommendation =
    suggested === 0
      ? inv.inventoryStatus === "overstock"
        ? "do_not_buy"
        : "healthy_stock"
      : inv.availableStock === 0
        ? "stockout_with_demand"
        : inv.availableStock < inv.minimumRequiredStock
          ? "minimum_stock_required"
          : "urgent_reorder";

  return {
    id: `dp-${i + 1}`,
    product: inv.product,
    variant: inv.variant,
    sku: inv.sku,
    vendor: inv.vendor,
    collection: inv.collection,
    stockCurrent: inv.currentStock,
    sales30: salesData[i].sales30,
    sales90: salesData[i].sales90,
    monthlyDemand,
    monthsCoverage: coverage,
    minimumRequiredStock: inv.minimumRequiredStock,
    reorderPoint: inv.reorderPoint,
    targetStock,
    suggestedQty: suggested,
    roundedQty: rounded,
    stockoutRisk,
    trend,
    recommendation,
    priority:
      stockoutRisk === "high" ? "high" : stockoutRisk === "medium" ? "medium" : suggested === 0 ? "none" : "low",
    status: "pending",
    reason:
      suggested > 0
        ? `Se recomienda comprar ${rounded} unidades para mantener cobertura y evitar ruptura.`
        : "No se recomienda compra por cobertura suficiente o sobrestock.",
  };
});

export const strategyData: StrategyItem[] = demandPlanningData.slice(0, 40).map((d, i) => {
  const strategyType: StrategyItem["strategyType"][] = [
    "promotion",
    "liquidation",
    "reorder_before_ads",
    "cross_selling",
    "up_selling",
    "email",
    "social",
    "do_not_ads",
    "new_product",
  ];
  const st = strategyType[i % strategyType.length];

  return {
    id: `st-${i + 1}`,
    scope: `${d.product} / ${d.collection}`,
    strategyType: st,
    diagnosis: `Diagnostico automatico para ${d.sku} con riesgo ${d.stockoutRisk}.`,
    action: st === "liquidation" ? "Activar descuento gradual y bundle" : "Ejecutar estrategia recomendada",
    channel: st === "email" ? "Email" : st === "social" ? "Meta Ads" : "Omnicanal",
    discountPct: st === "liquidation" ? 25 : st === "promotion" ? 15 : 0,
    message: `Mensaje sugerido para ${d.product}`,
    durationDays: st === "liquidation" ? 21 : 10,
    priority: d.priority,
    confidence: Number((0.55 + (i % 4) * 0.1).toFixed(2)),
    expectedImpact: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
    risk: d.stockoutRisk,
    status: "pending",
  };
});

export const alertData: AlertItem[] = demandPlanningData.slice(0, 52).map((d, i) => ({
  id: `al-${i + 1}`,
  alert: d.stockCurrent === 0 ? "Producto agotado" : d.stockoutRisk === "high" ? "Riesgo alto de agotado" : "Revisar cobertura",
  product: d.product,
  sku: d.sku,
  type: d.stockCurrent === 0 ? "stockout" : d.recommendation === "do_not_buy" ? "overstock" : "reorder",
  priority: d.priority,
  createdAt: new Date(Date.now() - i * 3 * 60 * 60 * 1000).toISOString(),
  status: i % 5 === 0 ? "resolved" : "open",
  reason: d.reason,
  suggestedAction: d.suggestedQty > 0 ? "Generar orden de compra" : "Enviar a estrategia comercial",
}));

export const collectionsData: CollectionItem[] = collections.map((name, i) => {
  const items = inventoryData.filter((p) => p.collection === name);
  const sales = salesData.filter((s) => s.collection === name);
  return {
    id: `col-${i + 1}`,
    name,
    products: items.length,
    stockTotal: items.reduce((acc, cur) => acc + cur.availableStock, 0),
    sales30: sales.reduce((acc, cur) => acc + cur.sales30, 0),
    sales90: sales.reduce((acc, cur) => acc + cur.sales90, 0),
    inventoryValue: items.reduce((acc, cur) => acc + cur.availableStock * 52000, 0),
    lowRotation: items.filter((x) => x.monthsOfInventory > 5).length,
    overstock: items.filter((x) => x.inventoryStatus === "overstock").length,
    stockoutRisk: items.filter((x) => x.inventoryStatus === "risk" || x.inventoryStatus === "stockout").length,
    strategy: i % 2 === 0 ? "Rotacion con bundles" : "Refuerzo de recompra",
  };
});

export const vendorsData: VendorItem[] = vendors.map((vendor) => {
  const inv = inventoryData.filter((x) => x.vendor === vendor);
  const sales = salesData.filter((x) => x.vendor === vendor);
  return {
    vendor,
    activeProducts: inv.length,
    stockTotal: inv.reduce((acc, cur) => acc + cur.availableStock, 0),
    sales30: sales.reduce((acc, cur) => acc + cur.sales30, 0),
    sales90: sales.reduce((acc, cur) => acc + cur.sales90, 0),
    inventoryValue: inv.reduce((acc, cur) => acc + cur.availableStock * 62000, 0),
    lowRotationProducts: inv.filter((x) => x.monthsOfInventory > 4).length,
    reorderProducts: inv.filter((x) => x.availableStock < x.reorderPoint).length,
    overstockProducts: inv.filter((x) => x.inventoryStatus === "overstock").length,
    recommendation: "Alinear lead time y surtido a demanda real",
  };
});

export const dashboardSummary: DashboardSummary = {
  totalActiveProducts: inventoryData.length,
  totalVariants: inventoryData.length * 2,
  estimatedInventoryValue: inventoryData.reduce((acc, cur) => acc + cur.availableStock * 58000, 0),
  salesLast30Days: salesData.reduce((acc, cur) => acc + cur.revenue30, 0),
  unitsSoldLast30Days: salesData.reduce((acc, cur) => acc + cur.sales30, 0),
  stockouts: inventoryData.filter((x) => x.inventoryStatus === "stockout").length,
  lowRotation: inventoryData.filter((x) => x.monthsOfInventory > 4).length,
  noSales: salesData.filter((x) => x.sales90 === 0).length,
  stockoutRisk: demandPlanningData.filter((x) => x.stockoutRisk === "high").length,
  overstock: inventoryData.filter((x) => x.inventoryStatus === "overstock").length,
  urgentReorder: demandPlanningData.filter((x) => x.recommendation.includes("reorder") && x.priority !== "none").length,
  pendingStrategies: strategyData.filter((x) => x.status === "pending").length,
  openAlerts: alertData.filter((x) => x.status === "open").length,
  executiveSummary: [
    `Hay ${demandPlanningData.filter((x) => x.minimumRequiredStock > x.stockCurrent).length} productos bajo el inventario minimo de 15 unidades.`,
    `Hay ${demandPlanningData.filter((x) => x.stockoutRisk === "high").length} SKUs con riesgo alto de agotarse antes del proximo ciclo.`,
    `El sistema recomienda recomprar ${demandPlanningData.reduce((acc, cur) => acc + cur.roundedQty, 0)} unidades en ${demandPlanningData.filter((x) => x.roundedQty > 0).length} SKUs.`,
    `Hay ${inventoryData.filter((x) => x.inventoryStatus === "overstock").length} productos con sobrestock para campanas de rotacion.`,
    `No se recomienda pautar ${strategyData.filter((x) => x.strategyType === "do_not_ads").length} productos por inventario bajo.`,
    `La coleccion ${collectionsData.sort((a, b) => b.inventoryValue - a.inventoryValue)[0].name} concentra el mayor valor de inventario quieto.`,
  ],
};

export function paginateAndFilter<T extends Record<string, unknown>>(
  source: T[],
  params: QueryParams,
): PaginatedResult<T> {
  const page = Number(params.page ?? 1);
  const pageSize = Number(params.pageSize ?? 20);
  const q = String(params.q ?? "").toLowerCase();
  const sortBy = String(params.sortBy ?? "");
  const sortDirection = String(params.sortDirection ?? "desc") === "asc" ? "asc" : "desc";

  let rows = source;

  if (q) {
    rows = rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(q)),
    );
  }

  Object.entries(params).forEach(([key, value]) => {
    if (["page", "pageSize", "q", "sortBy", "sortDirection"].includes(key) || value === undefined || value === "") {
      return;
    }
    rows = rows.filter((row) => String(row[key]).toLowerCase() === String(value).toLowerCase());
  });

  if (sortBy && rows.length > 0 && sortBy in rows[0]) {
    rows = [...rows].sort((a, b) => {
      const av = String(a[sortBy]);
      const bv = String(b[sortBy]);
      if (sortDirection === "asc") return av.localeCompare(bv, undefined, { numeric: true });
      return bv.localeCompare(av, undefined, { numeric: true });
    });
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const data = rows.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}
