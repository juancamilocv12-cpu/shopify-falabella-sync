import {
  alertData,
  collectionsData,
  dashboardSummary,
  demandPlanningData,
  inventoryData,
  paginateAndFilter,
  salesData,
  strategyData,
  vendorsData,
} from "@/lib/mock-data";
import type { QueryParams } from "@/types/dashboard";
import fs from "node:fs";
import path from "node:path";

type DashboardState = {
  inventoryData: typeof inventoryData;
  salesData: typeof salesData;
  demandPlanningData: typeof demandPlanningData;
  strategyData: typeof strategyData;
  alertData: typeof alertData;
  collectionsData: typeof collectionsData;
  vendorsData: typeof vendorsData;
  dashboardSummary: typeof dashboardSummary;
  source: "mock" | "shopify";
  lastSyncedAt: string | null;
};

const defaultState: DashboardState = {
  inventoryData: [...inventoryData],
  salesData: [...salesData],
  demandPlanningData: [...demandPlanningData],
  strategyData: [...strategyData],
  alertData: [...alertData],
  collectionsData: [...collectionsData],
  vendorsData: [...vendorsData],
  dashboardSummary: { ...dashboardSummary },
  source: "mock",
  lastSyncedAt: null,
};

let state: DashboardState = { ...defaultState };
let lastLoadedMtimeMs = 0;

const STATE_DIR = path.join(process.cwd(), ".cache");
const STATE_FILE = path.join(STATE_DIR, "dashboard-state.json");

function syncStateFromDisk() {
  if (!fs.existsSync(STATE_FILE)) return;
  const stats = fs.statSync(STATE_FILE);
  if (stats.mtimeMs <= lastLoadedMtimeMs) return;

  const raw = fs.readFileSync(STATE_FILE, "utf8");
  const parsed = JSON.parse(raw) as DashboardState;
  state = parsed;
  lastLoadedMtimeMs = stats.mtimeMs;
}

function persistStateToDisk() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state), "utf8");
  const stats = fs.statSync(STATE_FILE);
  lastLoadedMtimeMs = stats.mtimeMs;
}

syncStateFromDisk();

export function hydrateDashboardState(next: Omit<DashboardState, "source" | "lastSyncedAt">) {
  syncStateFromDisk();
  state.inventoryData = next.inventoryData;
  state.salesData = next.salesData;
  state.demandPlanningData = next.demandPlanningData;
  state.strategyData = next.strategyData;
  state.alertData = next.alertData;
  state.collectionsData = next.collectionsData;
  state.vendorsData = next.vendorsData;
  state.dashboardSummary = next.dashboardSummary;
  state.source = "shopify";
  state.lastSyncedAt = new Date().toISOString();
  persistStateToDisk();
}

export function getSyncStatus() {
  syncStateFromDisk();
  return {
    source: state.source,
    lastSyncedAt: state.lastSyncedAt,
  };
}

export function getDashboardSummary() {
  syncStateFromDisk();
  return state.dashboardSummary;
}

export function getDashboardCharts() {
  syncStateFromDisk();
  return {
    salesByDay30: Array.from({ length: 30 }).map((_, i) => ({
      day: `${i + 1}`,
      sales: Math.round(4000000 + Math.sin(i / 3) * 1200000 + i * 60000),
      units: Math.round(120 + Math.sin(i / 4) * 30 + i / 2),
    })),
    inventoryByCollection: state.collectionsData.map((c) => ({
      name: c.name,
      stock: c.stockTotal,
      value: c.inventoryValue,
    })),
    productsBySegment: [
      { segment: "core", value: 35 },
      { segment: "seasonal", value: 20 },
      { segment: "strategic", value: 17 },
      { segment: "experimental", value: 12 },
    ],
    top10Sold: state.salesData
      .slice()
      .sort((a, b) => b.sales30 - a.sales30)
      .slice(0, 10)
      .map((x) => ({ name: x.product, value: x.sales30 })),
    top10QuietInventory: state.inventoryData
      .slice()
      .sort((a, b) => b.monthsOfInventory - a.monthsOfInventory)
      .slice(0, 10)
      .map((x) => ({ name: x.product, value: x.monthsOfInventory })),
    inventoryStatus: [
      { status: "healthy", count: state.inventoryData.filter((x) => x.inventoryStatus === "healthy").length },
      { status: "attention", count: state.inventoryData.filter((x) => x.inventoryStatus === "attention").length },
      { status: "risk", count: state.inventoryData.filter((x) => x.inventoryStatus === "risk").length },
      { status: "stockout", count: state.inventoryData.filter((x) => x.inventoryStatus === "stockout").length },
      { status: "overstock", count: state.inventoryData.filter((x) => x.inventoryStatus === "overstock").length },
    ],
    reorderByVendor: state.vendorsData.map((v) => ({ vendor: v.vendor, reorder: v.reorderProducts })),
  };
}

export function getInventory(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.inventoryData, params);
}

export function getSales(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.salesData, params);
}

export function getLowRotation(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(
    state.inventoryData.filter((x) => x.monthsOfInventory >= 3 || x.daysOfInventory >= 90),
    params,
  );
}

export function getOverstock(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.inventoryData.filter((x) => x.inventoryStatus === "overstock"), params);
}

export function getStockouts(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.inventoryData.filter((x) => x.inventoryStatus === "stockout"), params);
}

export function getDemandPlanning(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.demandPlanningData, params);
}

export function getDemandAnalytics(params: QueryParams) {
  syncStateFromDisk();

  const baseRows = state.demandPlanningData.map((demand) => {
    const inv = state.inventoryData.find((item) => item.sku === demand.sku);
    return {
      id: demand.id,
      product: demand.product,
      sku: demand.sku,
      vendor: demand.vendor,
      collection: demand.collection,
      monthlyDemand: demand.monthlyDemand,
      daysOfInventory: inv?.daysOfInventory ?? 0,
      recommendedAt: demand.recommendedAt ?? inv?.lastSyncAt ?? new Date().toISOString(),
    };
  });

  const filteredRows = paginateAndFilter(baseRows, {
    ...params,
    page: 1,
    pageSize: Math.max(1, baseRows.length),
  }).data;

  const topDemand = [...filteredRows]
    .sort((a, b) => b.monthlyDemand - a.monthlyDemand)
    .slice(0, 12)
    .map((row) => ({
      product: row.product.length > 24 ? `${row.product.slice(0, 24)}...` : row.product,
      monthlyDemand: row.monthlyDemand,
    }));

  const demandVsInventoryDays = [...filteredRows]
    .sort((a, b) => b.monthlyDemand - a.monthlyDemand)
    .slice(0, 20)
    .map((row) => ({
      product: row.product.length > 20 ? `${row.product.slice(0, 20)}...` : row.product,
      monthlyDemand: row.monthlyDemand,
      daysOfInventory: Number(row.daysOfInventory.toFixed(1)),
    }));

  const inventoryCoverageBuckets = [
    { bucket: "0-15 dias", count: filteredRows.filter((x) => x.daysOfInventory <= 15).length },
    { bucket: "16-30 dias", count: filteredRows.filter((x) => x.daysOfInventory > 15 && x.daysOfInventory <= 30).length },
    { bucket: "31-60 dias", count: filteredRows.filter((x) => x.daysOfInventory > 30 && x.daysOfInventory <= 60).length },
    { bucket: "61+ dias", count: filteredRows.filter((x) => x.daysOfInventory > 60).length },
  ];

  const totalMonthlyDemand = filteredRows.reduce((acc, row) => acc + row.monthlyDemand, 0);
  const averageInventoryDays =
    filteredRows.length > 0
      ? Number((filteredRows.reduce((acc, row) => acc + row.daysOfInventory, 0) / filteredRows.length).toFixed(1))
      : 0;

  return {
    summary: {
      products: filteredRows.length,
      totalMonthlyDemand,
      averageInventoryDays,
    },
    topDemand,
    demandVsInventoryDays,
    inventoryCoverageBuckets,
  };
}

export function getReorderList(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.demandPlanningData.filter((x) => x.roundedQty > 0), params);
}

export function getMarketingStrategies(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.strategyData, params);
}

export function getProducts(params: QueryParams) {
  syncStateFromDisk();
  const merged = state.inventoryData.map((inv) => {
    const sale = state.salesData.find((s) => s.sku === inv.sku);
    return {
      id: inv.productId,
      image: `https://picsum.photos/seed/${inv.sku}/80/80`,
      product: inv.product,
      status: "active",
      vendor: inv.vendor,
      productType: inv.productType,
      tags: inv.tags.join(", "),
      collections: inv.collection,
      variants: Math.ceil(inv.currentStock % 4) + 1,
      stockTotal: inv.currentStock,
      sales30: sale?.sales30 ?? 0,
      sales90: sale?.sales90 ?? 0,
      segment: inv.tags.includes("seasonal") ? "seasonal" : "core",
      inventoryStatus: inv.inventoryStatus,
      suggestedAction: inv.inventoryStatus === "overstock" ? "Promocionar" : "Monitorear",
    };
  });
  return paginateAndFilter(merged, params);
}

export function getProductById(id: string) {
  syncStateFromDisk();
  const inv = state.inventoryData.find((x) => x.productId === id);
  if (!inv) return null;
  const sale = state.salesData.find((x) => x.sku === inv.sku);
  const demand = state.demandPlanningData.find((x) => x.sku === inv.sku);

  return {
    ...inv,
    sales: sale,
    demand,
    recommendations: state.demandPlanningData.filter((x) => x.product === inv.product).slice(0, 5),
    alerts: state.alertData.filter((x) => x.sku === inv.sku),
    strategies: state.strategyData.filter((x) => x.scope.includes(inv.product)).slice(0, 5),
    inventoryByLocation: locationsMock(inv),
  };
}

function locationsMock(inv: { availableStock: number; product: string }) {
  return [
    { location: "Bogota", stock: Math.max(0, inv.availableStock - 4), reserved: 2 },
    { location: "Medellin", stock: Math.max(0, Math.round(inv.availableStock * 0.4)), reserved: 1 },
    { location: "Cali", stock: Math.max(0, Math.round(inv.availableStock * 0.2)), reserved: 0 },
  ].map((l) => ({ ...l, product: inv.product }));
}

export function getCollections(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.collectionsData, params);
}

export function getCollectionById(id: string) {
  syncStateFromDisk();
  const found = state.collectionsData.find((x) => x.id === id);
  if (!found) return null;
  return {
    ...found,
    products: state.inventoryData.filter((x) => x.collection === found.name),
    strategies: state.strategyData.filter((s) => s.scope.includes(found.name)).slice(0, 10),
    demand: state.demandPlanningData.filter((d) => d.collection === found.name).slice(0, 10),
    alerts: state.alertData.filter((a) => a.product.includes(found.name)).slice(0, 10),
  };
}

export function getVendors(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.vendorsData, params);
}

export function getVendorDetail(vendor: string) {
  syncStateFromDisk();
  const found = state.vendorsData.find((x) => x.vendor.toLowerCase() === vendor.toLowerCase());
  if (!found) return null;
  return {
    ...found,
    products: state.inventoryData.filter((x) => x.vendor === found.vendor),
    reorder: state.demandPlanningData.filter((d) => d.vendor === found.vendor && d.roundedQty > 0),
    strategies: state.strategyData.filter((s) => s.scope.includes(found.vendor)),
  };
}

export function getAlerts(params: QueryParams) {
  syncStateFromDisk();
  return paginateAndFilter(state.alertData, params);
}

export function resolveAlert(id: string) {
  syncStateFromDisk();
  const alert = state.alertData.find((x) => x.id === id);
  if (!alert) return null;
  alert.status = "resolved";
  persistStateToDisk();
  return alert;
}

export function updateRecommendationStatus(
  id: string,
  status: "accepted" | "rejected" | "executed",
) {
  syncStateFromDisk();
  const rec = state.demandPlanningData.find((x) => x.id === id);
  if (!rec) return null;
  rec.status = status;
  persistStateToDisk();
  return rec;
}

export function getExportData(type: string) {
  syncStateFromDisk();
  switch (type) {
    case "inventory":
      return state.inventoryData;
    case "low-rotation":
      return state.inventoryData.filter((x) => x.monthsOfInventory >= 3);
    case "overstock":
      return state.inventoryData.filter((x) => x.inventoryStatus === "overstock");
    case "reorder-list":
      return state.demandPlanningData.filter((x) => x.roundedQty > 0);
    case "demand-planning":
      return state.demandPlanningData;
    case "marketing-strategies":
      return state.strategyData;
    case "stockouts":
      return state.inventoryData.filter((x) => x.inventoryStatus === "stockout");
    case "collections":
      return state.collectionsData;
    case "vendors":
      return state.vendorsData;
    case "executive":
      return state.dashboardSummary;
    default:
      return [];
  }
}
