// =============================================================================
// DEMAND PLANNING ENGINE - TYPES
// Todos los tipos, interfaces y enumeraciones del módulo de planeación de demanda
// =============================================================================

// ─── Enumeraciones ───────────────────────────────────────────────────────────

export enum DemandTrend {
  GROWING = 'growing',
  STABLE = 'stable',
  DECLINING = 'declining',
  NO_DATA = 'no_data',
}

export enum StockoutRisk {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export enum RecommendationType {
  URGENT_REORDER = 'urgent_reorder',
  UPCOMING_REORDER = 'upcoming_reorder',
  HEALTHY_STOCK = 'healthy_stock',
  MINIMUM_STOCK_REQUIRED = 'minimum_stock_required',
  OVERSTOCK = 'overstock',
  DO_NOT_BUY = 'do_not_buy',
  NEW_OBSERVATION = 'new_observation',
  GROWING_DEMAND = 'growing_demand',
  DECLINING_DEMAND = 'declining_demand',
  STOCKOUT_RISK = 'stockout_risk',
  STOCKOUT_WITH_DEMAND = 'stockout_with_demand',
  INSUFFICIENT_FOR_LEAD_TIME = 'insufficient_for_lead_time',
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export enum RecommendationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ORDERED = 'ordered',
  IGNORED = 'ignored',
}

/** Campo compartido entre módulos de inventario, mercadeo y alertas */
export enum InventoryActionStatus {
  BUY_NOW = 'buy_now',
  BUY_SOON = 'buy_soon',
  HEALTHY = 'healthy',
  DO_NOT_BUY = 'do_not_buy',
  OVERSTOCK = 'overstock',
  STOCKOUT_RISK = 'stockout_risk',
  NEW_OBSERVATION = 'new_observation',
}

// ─── Configuración ───────────────────────────────────────────────────────────

export interface SupplierConfig {
  vendor: string;
  leadTimeDays: number;
  supplierPackSize?: number;
  minPurchaseQuantity?: number;
  maxPurchaseQuantity?: number;
}

export interface DemandPlanningConfig {
  /** Inventario mínimo base obligatorio (default: 15) */
  minimumStockBase: number;
  /** Meses de cobertura objetivo (default: 2) */
  targetCoverageMonths: number;
  /** Días de historial para calcular demanda (default: 90) */
  demandLookbackDays: number;
  /** Porcentaje de safety stock sobre lead time demand (default: 0.20 = 20%) */
  safetyStockPercentage: number;
  /** Lead time por defecto en días (default: 15) */
  defaultLeadTimeDays: number;
  /** Días extra de buffer al punto de recompra (default: 5) */
  reorderPointBufferDays: number;
  /** Días mínimos de historial de ventas para confiar en la demanda (default: 14) */
  minSalesHistoryDays: number;
  /** Tags de productos excluidos de reposición */
  excludeTags: string[];
  /** Proveedores excluidos de reposición */
  excludeVendors: string[];
  /** Tipos de producto excluidos */
  excludeProductTypes: string[];
  /** IDs o handles de colecciones estacionales */
  seasonalCollections: string[];
  /** Tags que marcan productos estacionales */
  seasonalTags: string[];
  /** IDs de productos marcados como estratégicos (siempre se reponen) */
  strategicProductIds: string[];
  /** Cantidad máxima de compra global (0 = sin límite) */
  maxPurchaseQuantity: number;
  /** Cantidad mínima de compra global (0 = sin límite) */
  minPurchaseQuantity: number;
  /** Umbral diario mínimo para clasificar como alta rotación */
  highDemandThreshold: number;
  /** Umbral diario máximo para clasificar como baja rotación */
  lowDemandThreshold: number;
  /** Factor de multiplicación para productos con demanda creciente */
  growingDemandFactor: number;
}

// ─── Datos de entrada ─────────────────────────────────────────────────────────

export interface SalesDataPoint {
  date: string;
  unitsSold: number;
}

export interface SalesHistory {
  variantId: string;
  productId: string;
  sku: string;
  salesData: SalesDataPoint[];
  unitsSold7Days: number;
  unitsSold15Days: number;
  unitsSold30Days: number;
  unitsSold60Days: number;
  unitsSold90Days: number;
  unitsSold180Days: number;
  unitsSold365Days: number;
  lastSaleDate?: string;
  daysSinceLastSale?: number;
  /** Días en que el producto estuvo sin stock en el período */
  daysOutOfStock?: number;
}

export interface InventoryLevel {
  variantId: string;
  locationId?: string;
  currentStock: number;
  availableStock: number;
  committedStock: number;
  incomingStock: number;
  tracked: boolean;
}

export interface ProductWithMetrics {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  collectionIds: string[];
  metafields?: Record<string, unknown>;
  isStrategic?: boolean;
}

export interface VariantWithMetrics {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  inventoryItemId: string;
  cost?: number;
}

// ─── Resultado principal ──────────────────────────────────────────────────────

export interface DemandPlanningRecommendation {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  vendor: string;
  collectionId?: string;

  currentStock: number;
  availableStock: number;
  incomingStock: number;
  committedStock: number;

  unitsSold7Days: number;
  unitsSold15Days: number;
  unitsSold30Days: number;
  unitsSold60Days: number;
  unitsSold90Days: number;
  unitsSold180Days: number;

  dailyDemand: number;
  weeklyDemand: number;
  monthlyDemand: number;

  targetCoverageMonths: number;
  leadTimeDays: number;
  leadTimeDemand: number;
  safetyStock: number;
  minimumRequiredStock: number;
  reorderPoint: number;
  targetStock: number;

  suggestedPurchaseQuantity: number;
  roundedPurchaseQuantity: number;

  daysOfInventory: number;
  monthsOfInventory: number;

  stockoutRisk: StockoutRisk;
  demandTrend: DemandTrend;
  recommendationType: RecommendationType;
  priority: Priority;
  inventoryActionStatus: InventoryActionStatus;

  reason: string;
  status: RecommendationStatus;

  createdAt: Date;
  updatedAt: Date;

  estimatedLostSales?: number;
  daysSinceLastSale?: number;
  isExcluded: boolean;
  isStrategic: boolean;
  isSeasonal: boolean;
  supplierPackSize?: number;
}

// ─── Entrada de la función principal ─────────────────────────────────────────

export interface GenerateDemandPlanningInput {
  products: ProductWithMetrics[];
  variants: VariantWithMetrics[];
  inventoryLevels: InventoryLevel[];
  salesHistory: SalesHistory[];
  supplierConfig: SupplierConfig[];
  config: DemandPlanningConfig;
}

// ─── KPIs del dashboard ───────────────────────────────────────────────────────

export interface DemandPlanningKPIs {
  totalProducts: number;
  belowMinimumStock: number;
  stockoutRiskHigh: number;
  urgentReorder: number;
  healthyStock: number;
  overstock: number;
  estimatedPurchaseValue: number;
  suggestedPurchaseUnits: number;
  growingDemand: number;
  decliningDemand: number;
  doNotBuy: number;
  newObservation: number;
}

// ─── Resumen ejecutivo ────────────────────────────────────────────────────────

export interface ExecutiveSummary {
  generatedAt: Date;
  totalSKUs: number;
  totalSuggestedUnits: number;
  totalSuggestedSKUs: number;
  highRiskStockout: number;
  belowMinimumStock: number;
  overstock: number;
  kpis: DemandPlanningKPIs;
  narrative: string;
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

export enum AlertType {
  BELOW_MINIMUM_STOCK = 'below_minimum_stock',
  BELOW_REORDER_POINT = 'below_reorder_point',
  INVENTORY_BELOW_LEAD_TIME = 'inventory_below_lead_time',
  STOCKOUT_WITH_DEMAND = 'stockout_with_demand',
  GROWING_DEMAND_LOW_STOCK = 'growing_demand_low_stock',
  URGENT_PURCHASE_SUGGESTED = 'urgent_purchase_suggested',
  HEALTHY_DO_NOT_BUY = 'healthy_do_not_buy',
}

export interface DemandPlanningAlert {
  id: string;
  variantId: string;
  sku: string;
  productTitle: string;
  alertType: AlertType;
  message: string;
  priority: Priority;
  createdAt: Date;
}

// ─── Integración con MarketingStrategyEngine ──────────────────────────────────

export interface MarketingSignal {
  variantId: string;
  sku: string;
  inventoryActionStatus: InventoryActionStatus;
  recommendationType: RecommendationType;
  marketingSuggestion: string;
  canRunAggressivePromotion: boolean;
  canRunPaidAds: boolean;
  suggestLiquidation: boolean;
  suggestWaitlist: boolean;
}
