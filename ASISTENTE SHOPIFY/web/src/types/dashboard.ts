export type Priority = "critical" | "high" | "medium" | "low" | "none";
export type StockRisk = "high" | "medium" | "low" | "none";
export type Trend = "growing" | "stable" | "declining" | "no_data";

export interface ProductItem {
  id: string;
  title: string;
  imageUrl?: string;
  vendor: string;
  productType: string;
  tags: string[];
  collections: string[];
  status: "active" | "draft" | "archived";
  segment: "core" | "seasonal" | "strategic" | "experimental";
  variantsCount: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  product: string;
  variant: string;
  sku: string;
  collection: string;
  vendor: string;
  productType: string;
  tags: string[];
  location: string;
  currentStock: number;
  availableStock: number;
  committedStock: number;
  incomingStock: number;
  minimumRequiredStock: number;
  reorderPoint: number;
  daysOfInventory: number;
  monthsOfInventory: number;
  inventoryStatus: "healthy" | "attention" | "risk" | "overstock" | "stockout";
  lastSyncAt: string;
}

export interface SalesItem {
  id: string;
  product: string;
  sku: string;
  collection: string;
  vendor: string;
  sales7: number;
  sales30: number;
  sales90: number;
  sales180: number;
  revenue30: number;
  revenue90: number;
  trend: Trend;
  stock: number;
}

export interface DemandPlanningItem {
  id: string;
  product: string;
  variant: string;
  sku: string;
  vendor: string;
  collection: string;
  stockCurrent: number;
  sales30: number;
  sales90: number;
  monthlyDemand: number;
  monthsCoverage: number;
  minimumRequiredStock: number;
  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;
  roundedQty: number;
  stockoutRisk: StockRisk;
  trend: Trend;
  recommendation: string;
  priority: Priority;
  status: "pending" | "accepted" | "rejected" | "executed";
  reason: string;
  recommendedAt: string;
}

export interface StrategyItem {
  id: string;
  scope: string;
  strategyType:
    | "promotion"
    | "liquidation"
    | "reorder_before_ads"
    | "cross_selling"
    | "up_selling"
    | "email"
    | "social"
    | "do_not_ads"
    | "new_product";
  diagnosis: string;
  action: string;
  channel: string;
  discountPct: number;
  message: string;
  durationDays: number;
  priority: Priority;
  confidence: number;
  expectedImpact: "high" | "medium" | "low";
  risk: StockRisk;
  status: "pending" | "accepted" | "rejected" | "executed";
}

export interface AlertItem {
  id: string;
  alert: string;
  product: string;
  sku: string;
  type: "inventory" | "marketing" | "reorder" | "stockout" | "overstock";
  priority: Priority;
  createdAt: string;
  status: "open" | "resolved" | "ignored";
  reason: string;
  suggestedAction: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  products: number;
  stockTotal: number;
  sales30: number;
  sales90: number;
  inventoryValue: number;
  lowRotation: number;
  overstock: number;
  stockoutRisk: number;
  strategy: string;
}

export interface VendorItem {
  vendor: string;
  activeProducts: number;
  stockTotal: number;
  sales30: number;
  sales90: number;
  inventoryValue: number;
  lowRotationProducts: number;
  reorderProducts: number;
  overstockProducts: number;
  recommendation: string;
}

export interface DashboardSummary {
  totalActiveProducts: number;
  totalVariants: number;
  estimatedInventoryValue: number;
  salesLast30Days: number;
  unitsSoldLast30Days: number;
  stockouts: number;
  lowRotation: number;
  noSales: number;
  stockoutRisk: number;
  overstock: number;
  urgentReorder: number;
  pendingStrategies: number;
  openAlerts: number;
  executiveSummary: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  fromDate?: string;
  toDate?: string;
  [key: string]: string | number | undefined;
}
