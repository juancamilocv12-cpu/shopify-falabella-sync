// =============================================================================
// DEMAND PLANNING ENGINE
// Motor de planeación de demanda y reabastecimiento para productos Shopify
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  AlertType,
  DemandPlanningAlert,
  DemandPlanningConfig,
  DemandPlanningKPIs,
  DemandPlanningRecommendation,
  DemandTrend,
  ExecutiveSummary,
  GenerateDemandPlanningInput,
  InventoryActionStatus,
  InventoryLevel,
  MarketingSignal,
  Priority,
  ProductWithMetrics,
  RecommendationStatus,
  RecommendationType,
  SalesHistory,
  StockoutRisk,
  SupplierConfig,
  VariantWithMetrics,
} from '../types/demandPlanning';

// =============================================================================
// HELPERS DE CÁLCULO
// =============================================================================

/** Calcula la demanda diaria promedio según el período de lookback */
function calcDailyDemand(sales: SalesHistory, lookbackDays: number): number {
  let unitsSold: number;
  if (lookbackDays <= 7) unitsSold = sales.unitsSold7Days;
  else if (lookbackDays <= 15) unitsSold = sales.unitsSold15Days;
  else if (lookbackDays <= 30) unitsSold = sales.unitsSold30Days;
  else if (lookbackDays <= 60) unitsSold = sales.unitsSold60Days;
  else if (lookbackDays <= 90) unitsSold = sales.unitsSold90Days;
  else if (lookbackDays <= 180) unitsSold = sales.unitsSold180Days;
  else unitsSold = sales.unitsSold365Days;

  if (unitsSold <= 0 || lookbackDays <= 0) return 0;
  return unitsSold / lookbackDays;
}

/** Determina la tendencia de demanda comparando ventas recientes vs históricas */
function calcDemandTrend(sales: SalesHistory, lookbackDays: number): DemandTrend {
  if (sales.unitsSold30Days === 0 && sales.unitsSold90Days === 0) {
    return DemandTrend.NO_DATA;
  }

  const recentDaily = sales.unitsSold30Days / 30;
  // Referencia: promedio diario del período más largo disponible
  const historicalDays = Math.max(lookbackDays, 90);
  let historicalUnits: number;
  if (historicalDays <= 90) historicalUnits = sales.unitsSold90Days;
  else if (historicalDays <= 180) historicalUnits = sales.unitsSold180Days;
  else historicalUnits = sales.unitsSold365Days;

  if (historicalDays === 0 || historicalUnits === 0) return DemandTrend.NO_DATA;
  const historicalDaily = historicalUnits / historicalDays;

  if (historicalDaily === 0) {
    return recentDaily > 0 ? DemandTrend.GROWING : DemandTrend.NO_DATA;
  }

  const ratio = recentDaily / historicalDaily;
  if (ratio >= 1.2) return DemandTrend.GROWING;
  if (ratio <= 0.8) return DemandTrend.DECLINING;
  return DemandTrend.STABLE;
}

/** Calcula el riesgo de agotado según días de inventario y lead time */
function calcStockoutRisk(
  daysOfInventory: number,
  leadTimeDays: number,
  bufferDays: number,
  dailyDemand: number,
): StockoutRisk {
  if (dailyDemand === 0) return StockoutRisk.NONE;
  const threshold = leadTimeDays + bufferDays;
  if (daysOfInventory <= 0) return StockoutRisk.HIGH;
  if (daysOfInventory < threshold) return StockoutRisk.HIGH;
  if (daysOfInventory < threshold * 2) return StockoutRisk.MEDIUM;
  return StockoutRisk.LOW;
}

/** Redondea al múltiplo superior de packSize */
function roundToPackSize(qty: number, packSize: number): number {
  if (packSize <= 0 || qty <= 0) return Math.max(0, qty);
  return Math.ceil(qty / packSize) * packSize;
}

/** Verifica si un producto está excluido de reposición */
function isProductExcluded(
  product: ProductWithMetrics,
  config: DemandPlanningConfig,
): boolean {
  if (config.excludeVendors.includes(product.vendor)) return true;
  if (config.excludeProductTypes.includes(product.productType)) return true;
  const hasExcludedTag = product.tags.some((tag) =>
    config.excludeTags.includes(tag.toLowerCase()),
  );
  return hasExcludedTag;
}

/** Verifica si un producto es estacional */
function isProductSeasonal(
  product: ProductWithMetrics,
  config: DemandPlanningConfig,
): boolean {
  const hasSeasonalTag = product.tags.some((tag) =>
    config.seasonalTags.includes(tag.toLowerCase()),
  );
  if (hasSeasonalTag) return true;
  const inSeasonalCollection = product.collectionIds.some((id) =>
    config.seasonalCollections.includes(id),
  );
  return inSeasonalCollection;
}

/** Determina si el producto tiene suficiente historial confiable */
function hasReliableHistory(
  product: ProductWithMetrics,
  sales: SalesHistory,
  config: DemandPlanningConfig,
): boolean {
  const productAgeMs =
    Date.now() - new Date(product.createdAt).getTime();
  const productAgeDays = productAgeMs / (1000 * 60 * 60 * 24);
  return productAgeDays >= config.minSalesHistoryDays;
}

/** Obtiene la configuración de proveedor para un vendor dado */
function getSupplierConfig(
  vendor: string,
  supplierConfigs: SupplierConfig[],
  defaultLeadTime: number,
): SupplierConfig {
  const found = supplierConfigs.find(
    (s) => s.vendor.toLowerCase() === vendor.toLowerCase(),
  );
  return (
    found ?? {
      vendor,
      leadTimeDays: defaultLeadTime,
    }
  );
}

/** Genera la explicación legible para una recomendación */
function buildReason(
  recommendationType: RecommendationType,
  context: {
    dailyDemand: number;
    daysOfInventory: number;
    monthsOfInventory: number;
    targetStock: number;
    suggestedQty: number;
    leadTimeDays: number;
    minimumRequiredStock: number;
    reorderPoint: number;
    trend: DemandTrend;
    isExcluded: boolean;
    isNew: boolean;
    isSeasonal: boolean;
    availableStock: number;
    incomingStock: number;
  },
): string {
  const { dailyDemand, daysOfInventory, monthsOfInventory, targetStock, suggestedQty,
    leadTimeDays, minimumRequiredStock, reorderPoint, trend, isExcluded, isNew,
    isSeasonal, availableStock, incomingStock } = context;

  const demandStr = `Demanda diaria: ${dailyDemand.toFixed(2)} uds/día`;
  const coverageStr = `Cobertura actual: ${daysOfInventory.toFixed(0)} días (${monthsOfInventory.toFixed(1)} meses)`;

  switch (recommendationType) {
    case RecommendationType.URGENT_REORDER:
      return `⚠️ Recompra urgente. ${demandStr}. ${coverageStr}. El inventario disponible (${availableStock} uds) es menor al punto de recompra (${reorderPoint} uds). Se sugiere comprar ${suggestedQty} unidades para alcanzar el inventario objetivo de ${targetStock} uds.`;

    case RecommendationType.UPCOMING_REORDER:
      return `📅 Recompra próxima. ${demandStr}. ${coverageStr}. El stock actual está cerca del punto de recompra (${reorderPoint} uds). Programar compra de ${suggestedQty} unidades para mantener cobertura objetivo.`;

    case RecommendationType.HEALTHY_STOCK:
      return `✅ Stock saludable. ${demandStr}. ${coverageStr}. El inventario (${availableStock} uds) es suficiente para cubrir la demanda. No se requiere recompra en este momento.`;

    case RecommendationType.MINIMUM_STOCK_REQUIRED:
      return `🔔 Inventario bajo el mínimo obligatorio de ${minimumRequiredStock} uds. ${demandStr}. Disponible: ${availableStock} uds. Se recomienda reponer ${suggestedQty} unidades.`;

    case RecommendationType.OVERSTOCK:
      return `📦 Exceso de inventario. ${coverageStr}. El stock (${availableStock} uds) supera ampliamente el inventario objetivo (${targetStock} uds). No comprar. Evaluar estrategia de rotación o promoción.`;

    case RecommendationType.DO_NOT_BUY:
      return `🚫 No comprar. ${isExcluded ? 'Producto excluido de reposición por regla de configuración.' : `Sin ventas suficientes para justificar recompra. ${coverageStr}.`} Mantener en observación.`;

    case RecommendationType.NEW_OBSERVATION:
      return `🆕 Producto nuevo en observación. Historial insuficiente para calcular demanda confiable. Se aplica inventario mínimo base de ${minimumRequiredStock} uds. Revisar en ${leadTimeDays} días.`;

    case RecommendationType.GROWING_DEMAND:
      return `📈 Demanda creciente. Las ventas recientes superan el promedio histórico. ${demandStr}. ${coverageStr}. Se recomienda recompra anticipada de ${suggestedQty} unidades con safety stock elevado.`;

    case RecommendationType.DECLINING_DEMAND:
      return `📉 Demanda decreciente. Las ventas recientes están por debajo del promedio histórico. ${coverageStr}. ${suggestedQty > 0 ? `Compra reducida sugerida: ${suggestedQty} uds.` : 'No se recomienda compra en este momento.'}`;

    case RecommendationType.STOCKOUT_WITH_DEMAND:
      return `🔴 Producto agotado con demanda histórica positiva. ${demandStr}. Se estima pérdida de ventas. Recompra urgente de ${suggestedQty} unidades para restablecer inventario objetivo (${targetStock} uds). ${incomingStock > 0 ? `Hay ${incomingStock} uds en camino.` : ''}`;

    case RecommendationType.STOCKOUT_RISK:
      return `⚡ Riesgo de agotado. ${demandStr}. ${coverageStr}. El inventario actual no cubre el lead time del proveedor (${leadTimeDays} días). Comprar ${suggestedQty} unidades de inmediato.`;

    case RecommendationType.INSUFFICIENT_FOR_LEAD_TIME:
      return `⏱️ Inventario insuficiente para cubrir el lead time. ${demandStr}. ${coverageStr}. El proveedor tarda ${leadTimeDays} días en entregar. Se necesitan ${suggestedQty} unidades adicionales para no quedarse sin stock durante el período de entrega.`;

    default:
      return `${demandStr}. ${coverageStr}.`;
  }
}

/** Mapea RecommendationType a InventoryActionStatus */
function toInventoryActionStatus(
  type: RecommendationType,
  risk: StockoutRisk,
): InventoryActionStatus {
  if (
    type === RecommendationType.URGENT_REORDER ||
    type === RecommendationType.STOCKOUT_WITH_DEMAND
  )
    return InventoryActionStatus.BUY_NOW;
  if (
    type === RecommendationType.UPCOMING_REORDER ||
    type === RecommendationType.GROWING_DEMAND ||
    type === RecommendationType.MINIMUM_STOCK_REQUIRED ||
    type === RecommendationType.INSUFFICIENT_FOR_LEAD_TIME
  )
    return InventoryActionStatus.BUY_SOON;
  if (type === RecommendationType.HEALTHY_STOCK) return InventoryActionStatus.HEALTHY;
  if (type === RecommendationType.OVERSTOCK) return InventoryActionStatus.OVERSTOCK;
  if (type === RecommendationType.DO_NOT_BUY) return InventoryActionStatus.DO_NOT_BUY;
  if (type === RecommendationType.NEW_OBSERVATION)
    return InventoryActionStatus.NEW_OBSERVATION;
  if (risk === StockoutRisk.HIGH) return InventoryActionStatus.STOCKOUT_RISK;
  return InventoryActionStatus.HEALTHY;
}

/** Determina la prioridad según tipo de recomendación y riesgo */
function calcPriority(type: RecommendationType, risk: StockoutRisk): Priority {
  if (type === RecommendationType.STOCKOUT_WITH_DEMAND)
    return Priority.CRITICAL;
  if (
    type === RecommendationType.URGENT_REORDER ||
    type === RecommendationType.STOCKOUT_RISK ||
    type === RecommendationType.GROWING_DEMAND
  )
    return Priority.HIGH;
  if (
    type === RecommendationType.UPCOMING_REORDER ||
    type === RecommendationType.MINIMUM_STOCK_REQUIRED ||
    type === RecommendationType.INSUFFICIENT_FOR_LEAD_TIME
  )
    return Priority.MEDIUM;
  if (
    type === RecommendationType.DECLINING_DEMAND ||
    type === RecommendationType.HEALTHY_STOCK
  )
    return Priority.LOW;
  return Priority.NONE;
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Genera recomendaciones de planeación de demanda para todos los productos/variantes.
 * Implementa todas las reglas de negocio del DemandPlanningEngine.
 */
export function generateDemandPlanningRecommendations(
  input: GenerateDemandPlanningInput,
): DemandPlanningRecommendation[] {
  const { products, variants, inventoryLevels, salesHistory, supplierConfig, config } =
    input;

  // Indexar datos para acceso O(1)
  const inventoryMap = new Map<string, InventoryLevel>(
    inventoryLevels.map((inv) => [inv.variantId, inv]),
  );
  const salesMap = new Map<string, SalesHistory>(
    salesHistory.map((s) => [s.variantId, s]),
  );
  const productMap = new Map<string, ProductWithMetrics>(
    products.map((p) => [p.id, p]),
  );

  const recommendations: DemandPlanningRecommendation[] = [];

  for (const variant of variants) {
    const product = productMap.get(variant.productId);
    if (!product) continue;

    // Solo productos activos con inventario trackeado
    if (product.status !== 'active') continue;

    const inventory = inventoryMap.get(variant.id);
    if (!inventory || !inventory.tracked) continue;

    const sales = salesMap.get(variant.id);
    const emptySales: SalesHistory = {
      variantId: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      salesData: [],
      unitsSold7Days: 0,
      unitsSold15Days: 0,
      unitsSold30Days: 0,
      unitsSold60Days: 0,
      unitsSold90Days: 0,
      unitsSold180Days: 0,
      unitsSold365Days: 0,
    };
    const effectiveSales = sales ?? emptySales;

    const supplier = getSupplierConfig(
      product.vendor,
      supplierConfig,
      config.defaultLeadTimeDays,
    );

    const isExcluded = isProductExcluded(product, config) && !product.isStrategic;
    const isSeasonal = isProductSeasonal(product, config);
    const isStrategic =
      product.isStrategic === true ||
      config.strategicProductIds.includes(product.id);
    const isNew = !hasReliableHistory(product, effectiveSales, config);

    // ── Paso 1: Calcular demanda ───────────────────────────────────────────────
    let dailyDemand = calcDailyDemand(effectiveSales, config.demandLookbackDays);

    // Ajuste por tendencia creciente
    const demandTrend = calcDemandTrend(effectiveSales, config.demandLookbackDays);
    if (demandTrend === DemandTrend.GROWING) {
      dailyDemand *= config.growingDemandFactor;
    }

    const weeklyDemand = dailyDemand * 7;
    const monthlyDemand = dailyDemand * 30;

    // ── Paso 2: Cobertura actual ───────────────────────────────────────────────
    const { availableStock, currentStock, incomingStock, committedStock } = inventory;
    const daysOfInventory =
      dailyDemand > 0 ? availableStock / dailyDemand : availableStock > 0 ? 9999 : 0;
    const monthsOfInventory = daysOfInventory / 30;

    // ── Paso 3: Calculos de reabastecimiento ───────────────────────────────────
    const leadTimeDays = supplier.leadTimeDays;
    const leadTimeDemand = dailyDemand * leadTimeDays;
    const safetyStock = leadTimeDemand * config.safetyStockPercentage;
    const bufferDemand =
      dailyDemand * config.reorderPointBufferDays;

    const minimumRequiredStock = Math.max(
      config.minimumStockBase,
      Math.ceil(leadTimeDemand + safetyStock),
    );

    const reorderPoint = Math.max(
      config.minimumStockBase,
      Math.ceil(leadTimeDemand + safetyStock + bufferDemand),
    );

    const targetDemandCoverage = monthlyDemand * config.targetCoverageMonths;
    const targetStock = Math.max(
      config.minimumStockBase,
      Math.ceil(targetDemandCoverage + safetyStock),
    );

    // ── Paso 4: Cantidad sugerida de compra ────────────────────────────────────
    let rawSuggestedQty = targetStock - availableStock - incomingStock;

    // Ajuste por tendencia decreciente: reducir compra
    if (demandTrend === DemandTrend.DECLINING && rawSuggestedQty > 0) {
      rawSuggestedQty = Math.ceil(rawSuggestedQty * 0.7);
    }

    // Aplicar límites de compra
    if (config.maxPurchaseQuantity > 0) {
      rawSuggestedQty = Math.min(rawSuggestedQty, config.maxPurchaseQuantity);
    }
    if (supplier.maxPurchaseQuantity && supplier.maxPurchaseQuantity > 0) {
      rawSuggestedQty = Math.min(rawSuggestedQty, supplier.maxPurchaseQuantity);
    }

    let suggestedPurchaseQuantity = Math.max(0, rawSuggestedQty);

    // Mínimo de compra
    const globalMin = config.minPurchaseQuantity ?? 0;
    const supplierMin = supplier.minPurchaseQuantity ?? 0;
    const effectiveMin = Math.max(globalMin, supplierMin);
    if (suggestedPurchaseQuantity > 0 && suggestedPurchaseQuantity < effectiveMin) {
      suggestedPurchaseQuantity = effectiveMin;
    }

    // Redondear a múltiplo de empaque del proveedor
    const packSize = supplier.supplierPackSize ?? 0;
    const roundedPurchaseQuantity =
      packSize > 0
        ? roundToPackSize(suggestedPurchaseQuantity, packSize)
        : suggestedPurchaseQuantity;

    // ── Paso 5: Calcular riesgo de agotado ─────────────────────────────────────
    const stockoutRisk = calcStockoutRisk(
      daysOfInventory,
      leadTimeDays,
      config.reorderPointBufferDays,
      dailyDemand,
    );

    // ── Paso 6: Estimar ventas perdidas (si el producto estuvo agotado) ─────────
    let estimatedLostSales: number | undefined;
    if (
      effectiveSales.daysOutOfStock &&
      effectiveSales.daysOutOfStock > 0 &&
      dailyDemand > 0
    ) {
      estimatedLostSales = Math.ceil(effectiveSales.daysOutOfStock * dailyDemand);
    }

    // ── Paso 7: Determinar tipo de recomendación ───────────────────────────────
    let recommendationType: RecommendationType;
    let finalSuggestedQty = suggestedPurchaseQuantity;
    let finalRoundedQty = roundedPurchaseQuantity;

    if (isExcluded) {
      // Producto excluido por regla de configuración
      recommendationType = RecommendationType.DO_NOT_BUY;
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    } else if (isNew && !isStrategic) {
      // Producto nuevo sin historial
      recommendationType = RecommendationType.NEW_OBSERVATION;
      finalSuggestedQty =
        availableStock < config.minimumStockBase
          ? config.minimumStockBase - availableStock
          : 0;
      finalRoundedQty =
        packSize > 0 ? roundToPackSize(finalSuggestedQty, packSize) : finalSuggestedQty;
    } else if (availableStock === 0 && dailyDemand > 0) {
      // Agotado con demanda histórica
      recommendationType = RecommendationType.STOCKOUT_WITH_DEMAND;
    } else if (availableStock < config.minimumStockBase && dailyDemand === 0) {
      // Stock bajo el mínimo sin demanda
      recommendationType = RecommendationType.MINIMUM_STOCK_REQUIRED;
    } else if (effectiveSales.unitsSold180Days === 0 && availableStock > 0) {
      // Sin ventas en 180 días
      if (availableStock > targetStock * 1.5) {
        recommendationType = RecommendationType.OVERSTOCK;
      } else {
        recommendationType = RecommendationType.DO_NOT_BUY;
      }
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    } else if (availableStock <= 0 && dailyDemand === 0) {
      // Agotado sin demanda
      recommendationType = RecommendationType.DO_NOT_BUY;
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    } else if (stockoutRisk === StockoutRisk.HIGH && dailyDemand > 0) {
      // Riesgo alto con demanda activa
      if (daysOfInventory <= 0) {
        recommendationType = RecommendationType.STOCKOUT_WITH_DEMAND;
      } else {
        // Bajo alta demanda se prioriza recompra urgente para evitar quiebre.
        recommendationType = RecommendationType.URGENT_REORDER;
      }
    } else if (availableStock <= reorderPoint && dailyDemand > 0) {
      // Debajo del punto de recompra
      if (demandTrend === DemandTrend.GROWING) {
        recommendationType = RecommendationType.GROWING_DEMAND;
      } else {
        recommendationType = RecommendationType.URGENT_REORDER;
      }
    } else if (demandTrend === DemandTrend.GROWING && availableStock < targetStock) {
      recommendationType = RecommendationType.GROWING_DEMAND;
    } else if (demandTrend === DemandTrend.DECLINING) {
      if (availableStock >= targetStock) {
        recommendationType = RecommendationType.OVERSTOCK;
        finalSuggestedQty = 0;
        finalRoundedQty = 0;
      } else {
        recommendationType = RecommendationType.DECLINING_DEMAND;
      }
    } else if (availableStock > targetStock * 1.5) {
      // Exceso claro de inventario
      recommendationType = RecommendationType.OVERSTOCK;
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    } else if (availableStock < reorderPoint * 1.2 && dailyDemand > 0) {
      recommendationType = RecommendationType.UPCOMING_REORDER;
    } else if (dailyDemand > 0 && finalSuggestedQty <= 0) {
      recommendationType = RecommendationType.HEALTHY_STOCK;
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    } else {
      recommendationType = RecommendationType.HEALTHY_STOCK;
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    }

    // Garantía: si no hay demanda y el stock supera el mínimo, no comprar
    if (
      dailyDemand === 0 &&
      availableStock >= config.minimumStockBase &&
      !isStrategic &&
      recommendationType !== RecommendationType.NEW_OBSERVATION &&
      recommendationType !== RecommendationType.MINIMUM_STOCK_REQUIRED
    ) {
      recommendationType = RecommendationType.DO_NOT_BUY;
      finalSuggestedQty = 0;
      finalRoundedQty = 0;
    }

    const priority = calcPriority(recommendationType, stockoutRisk);
    const inventoryActionStatus = toInventoryActionStatus(
      recommendationType,
      stockoutRisk,
    );

    const reason = buildReason(recommendationType, {
      dailyDemand,
      daysOfInventory,
      monthsOfInventory,
      targetStock,
      suggestedQty: finalRoundedQty,
      leadTimeDays,
      minimumRequiredStock,
      reorderPoint,
      trend: demandTrend,
      isExcluded,
      isNew,
      isSeasonal,
      availableStock,
      incomingStock,
    });

    const now = new Date();

    recommendations.push({
      id: uuidv4(),
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      productTitle: product.title,
      variantTitle: variant.title,
      vendor: product.vendor,
      collectionId: product.collectionIds[0],

      currentStock,
      availableStock,
      incomingStock,
      committedStock,

      unitsSold7Days: effectiveSales.unitsSold7Days,
      unitsSold15Days: effectiveSales.unitsSold15Days,
      unitsSold30Days: effectiveSales.unitsSold30Days,
      unitsSold60Days: effectiveSales.unitsSold60Days,
      unitsSold90Days: effectiveSales.unitsSold90Days,
      unitsSold180Days: effectiveSales.unitsSold180Days,

      dailyDemand: parseFloat(dailyDemand.toFixed(4)),
      weeklyDemand: parseFloat(weeklyDemand.toFixed(2)),
      monthlyDemand: parseFloat(monthlyDemand.toFixed(2)),

      targetCoverageMonths: config.targetCoverageMonths,
      leadTimeDays,
      leadTimeDemand: parseFloat(leadTimeDemand.toFixed(2)),
      safetyStock: parseFloat(safetyStock.toFixed(2)),
      minimumRequiredStock,
      reorderPoint,
      targetStock,

      suggestedPurchaseQuantity: finalSuggestedQty,
      roundedPurchaseQuantity: finalRoundedQty,

      daysOfInventory: parseFloat(daysOfInventory.toFixed(1)),
      monthsOfInventory: parseFloat(monthsOfInventory.toFixed(2)),

      stockoutRisk,
      demandTrend,
      recommendationType,
      priority,
      inventoryActionStatus,

      reason,
      status: RecommendationStatus.PENDING,

      createdAt: now,
      updatedAt: now,

      estimatedLostSales,
      daysSinceLastSale: effectiveSales.daysSinceLastSale,
      isExcluded,
      isStrategic,
      isSeasonal,
      supplierPackSize: supplier.supplierPackSize,
    });
  }

  // Ordenar: mayor prioridad primero
  const priorityOrder: Record<Priority, number> = {
    [Priority.CRITICAL]: 0,
    [Priority.HIGH]: 1,
    [Priority.MEDIUM]: 2,
    [Priority.LOW]: 3,
    [Priority.NONE]: 4,
  };
  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return recommendations;
}

// =============================================================================
// ALERTAS AUTOMÁTICAS
// =============================================================================

export function generateAlerts(
  recommendations: DemandPlanningRecommendation[],
  config: DemandPlanningConfig,
): DemandPlanningAlert[] {
  const alerts: DemandPlanningAlert[] = [];
  const now = new Date();

  for (const rec of recommendations) {
    if (rec.isExcluded) continue;

    // Stock menor a 15
    if (rec.availableStock < config.minimumStockBase && !rec.isExcluded) {
      alerts.push({
        id: uuidv4(),
        variantId: rec.variantId,
        sku: rec.sku,
        productTitle: rec.productTitle,
        alertType: AlertType.BELOW_MINIMUM_STOCK,
        message: `"${rec.productTitle}" (SKU: ${rec.sku}) tiene solo ${rec.availableStock} unidades disponibles, por debajo del mínimo obligatorio de ${config.minimumStockBase}.`,
        priority: Priority.HIGH,
        createdAt: now,
      });
    }

    // Stock menor al punto de recompra
    if (rec.availableStock < rec.reorderPoint && rec.dailyDemand > 0) {
      alerts.push({
        id: uuidv4(),
        variantId: rec.variantId,
        sku: rec.sku,
        productTitle: rec.productTitle,
        alertType: AlertType.BELOW_REORDER_POINT,
        message: `"${rec.productTitle}" (SKU: ${rec.sku}) está por debajo del punto de recompra (${rec.reorderPoint} uds). Disponible: ${rec.availableStock} uds.`,
        priority: Priority.HIGH,
        createdAt: now,
      });
    }

    // Inventario por debajo del lead time
    if (rec.daysOfInventory < rec.leadTimeDays && rec.dailyDemand > 0) {
      alerts.push({
        id: uuidv4(),
        variantId: rec.variantId,
        sku: rec.sku,
        productTitle: rec.productTitle,
        alertType: AlertType.INVENTORY_BELOW_LEAD_TIME,
        message: `"${rec.productTitle}" (SKU: ${rec.sku}) tiene ${rec.daysOfInventory.toFixed(0)} días de inventario, menos que el lead time del proveedor (${rec.leadTimeDays} días). Compra urgente requerida.`,
        priority: Priority.CRITICAL,
        createdAt: now,
      });
    }

    // Producto agotado con demanda
    if (rec.recommendationType === RecommendationType.STOCKOUT_WITH_DEMAND) {
      alerts.push({
        id: uuidv4(),
        variantId: rec.variantId,
        sku: rec.sku,
        productTitle: rec.productTitle,
        alertType: AlertType.STOCKOUT_WITH_DEMAND,
        message: `"${rec.productTitle}" (SKU: ${rec.sku}) está AGOTADO y tiene demanda histórica de ${rec.dailyDemand.toFixed(2)} uds/día. Recompra urgente: ${rec.roundedPurchaseQuantity} unidades.`,
        priority: Priority.CRITICAL,
        createdAt: now,
      });
    }

    // Demanda creciente con stock insuficiente
    if (
      rec.demandTrend === DemandTrend.GROWING &&
      rec.availableStock < rec.reorderPoint
    ) {
      alerts.push({
        id: uuidv4(),
        variantId: rec.variantId,
        sku: rec.sku,
        productTitle: rec.productTitle,
        alertType: AlertType.GROWING_DEMAND_LOW_STOCK,
        message: `"${rec.productTitle}" (SKU: ${rec.sku}) tiene tendencia creciente pero stock insuficiente (${rec.availableStock} uds vs. punto de recompra ${rec.reorderPoint} uds). Compra anticipada sugerida: ${rec.roundedPurchaseQuantity} uds.`,
        priority: Priority.HIGH,
        createdAt: now,
      });
    }

    // Recompra urgente general
    if (rec.priority === Priority.CRITICAL || rec.priority === Priority.HIGH) {
      if (
        rec.recommendationType !== RecommendationType.STOCKOUT_WITH_DEMAND &&
        rec.roundedPurchaseQuantity > 0
      ) {
        alerts.push({
          id: uuidv4(),
          variantId: rec.variantId,
          sku: rec.sku,
          productTitle: rec.productTitle,
          alertType: AlertType.URGENT_PURCHASE_SUGGESTED,
          message: `Compra urgente sugerida para "${rec.productTitle}" (SKU: ${rec.sku}): ${rec.roundedPurchaseQuantity} unidades. ${rec.reason}`,
          priority: rec.priority,
          createdAt: now,
        });
      }
    }

    // Producto saludable: aviso de no comprar
    if (
      rec.recommendationType === RecommendationType.HEALTHY_STOCK &&
      rec.monthsOfInventory >= rec.targetCoverageMonths
    ) {
      alerts.push({
        id: uuidv4(),
        variantId: rec.variantId,
        sku: rec.sku,
        productTitle: rec.productTitle,
        alertType: AlertType.HEALTHY_DO_NOT_BUY,
        message: `"${rec.productTitle}" (SKU: ${rec.sku}) tiene ${rec.monthsOfInventory.toFixed(1)} meses de inventario. No se requiere compra.`,
        priority: Priority.NONE,
        createdAt: now,
      });
    }
  }

  return alerts;
}

// =============================================================================
// SEÑALES PARA MARKETING STRATEGY ENGINE
// =============================================================================

export function generateMarketingSignals(
  recommendations: DemandPlanningRecommendation[],
): MarketingSignal[] {
  return recommendations.map((rec) => {
    let marketingSuggestion = '';
    let canRunAggressivePromotion = false;
    let canRunPaidAds = false;
    let suggestLiquidation = false;
    let suggestWaitlist = false;

    switch (rec.inventoryActionStatus) {
      case InventoryActionStatus.BUY_NOW:
        // Agotado o riesgo crítico: no promover agresivamente
        marketingSuggestion =
          'Producto con stock crítico o agotado. No lanzar campañas agresivas. ' +
          'Sugerir lista de espera o productos sustitutos hasta reabastecimiento.';
        canRunAggressivePromotion = false;
        canRunPaidAds = false;
        suggestWaitlist = rec.availableStock === 0;
        break;

      case InventoryActionStatus.BUY_SOON:
        // Stock bajo pero con recompra en proceso
        marketingSuggestion =
          'Stock bajo. Limitar campañas de pauta hasta confirmar reabastecimiento. ' +
          'Se puede hacer email a lista existente pero sin impulsar tráfico masivo.';
        canRunAggressivePromotion = false;
        canRunPaidAds = false;
        break;

      case InventoryActionStatus.HEALTHY:
        // Stock saludable: promover con normalidad
        marketingSuggestion =
          'Stock saludable. Se puede activar pauta, email marketing, homepage y campañas de impulso.';
        canRunAggressivePromotion = false;
        canRunPaidAds = true;
        break;

      case InventoryActionStatus.OVERSTOCK:
        // Exceso: promover para rotar
        marketingSuggestion =
          'Exceso de inventario. Sugerir descuento, bundle, liquidación o campaña de rotación para reducir stock.';
        canRunAggressivePromotion = true;
        canRunPaidAds = true;
        suggestLiquidation = true;
        break;

      case InventoryActionStatus.DO_NOT_BUY:
        // No comprar: si hay stock, evaluar liquidar
        marketingSuggestion =
          rec.availableStock > 0
            ? 'Producto sin rotación. Evaluar liquidación, bundle o descontinuación.'
            : 'Producto sin rotación ni stock. Sin acción de mercadeo requerida.';
        canRunAggressivePromotion = rec.availableStock > 0;
        suggestLiquidation = rec.availableStock > 0;
        break;

      case InventoryActionStatus.STOCKOUT_RISK:
        marketingSuggestion =
          'Riesgo de agotado inminente. Pausar campañas que incrementen demanda hasta reabastecimiento.';
        canRunAggressivePromotion = false;
        canRunPaidAds = false;
        suggestWaitlist = true;
        break;

      case InventoryActionStatus.NEW_OBSERVATION:
        marketingSuggestion =
          'Producto nuevo. Iniciar con campañas pequeñas para medir demanda real antes de invertir.';
        canRunAggressivePromotion = false;
        canRunPaidAds = true;
        break;
    }

    return {
      variantId: rec.variantId,
      sku: rec.sku,
      inventoryActionStatus: rec.inventoryActionStatus,
      recommendationType: rec.recommendationType,
      marketingSuggestion,
      canRunAggressivePromotion,
      canRunPaidAds,
      suggestLiquidation,
      suggestWaitlist,
    };
  });
}

// =============================================================================
// KPIs DEL DASHBOARD
// =============================================================================

export function calcKPIs(
  recommendations: DemandPlanningRecommendation[],
  variants: VariantWithMetrics[],
  config: DemandPlanningConfig,
): DemandPlanningKPIs {
  const variantPriceMap = new Map(variants.map((v) => [v.id, v.price]));

  let estimatedPurchaseValue = 0;
  let suggestedPurchaseUnits = 0;

  for (const rec of recommendations) {
    if (rec.roundedPurchaseQuantity > 0) {
      const price = variantPriceMap.get(rec.variantId) ?? 0;
      estimatedPurchaseValue += rec.roundedPurchaseQuantity * price;
      suggestedPurchaseUnits += rec.roundedPurchaseQuantity;
    }
  }

  return {
    totalProducts: recommendations.length,
    belowMinimumStock: recommendations.filter(
      (r) => r.availableStock < config.minimumStockBase && !r.isExcluded,
    ).length,
    stockoutRiskHigh: recommendations.filter(
      (r) => r.stockoutRisk === StockoutRisk.HIGH,
    ).length,
    urgentReorder: recommendations.filter(
      (r) =>
        r.recommendationType === RecommendationType.URGENT_REORDER ||
        r.recommendationType === RecommendationType.STOCKOUT_WITH_DEMAND,
    ).length,
    healthyStock: recommendations.filter(
      (r) => r.recommendationType === RecommendationType.HEALTHY_STOCK,
    ).length,
    overstock: recommendations.filter(
      (r) => r.recommendationType === RecommendationType.OVERSTOCK,
    ).length,
    estimatedPurchaseValue: parseFloat(estimatedPurchaseValue.toFixed(2)),
    suggestedPurchaseUnits,
    growingDemand: recommendations.filter(
      (r) => r.demandTrend === DemandTrend.GROWING,
    ).length,
    decliningDemand: recommendations.filter(
      (r) => r.demandTrend === DemandTrend.DECLINING,
    ).length,
    doNotBuy: recommendations.filter(
      (r) => r.recommendationType === RecommendationType.DO_NOT_BUY,
    ).length,
    newObservation: recommendations.filter(
      (r) => r.recommendationType === RecommendationType.NEW_OBSERVATION,
    ).length,
  };
}

// =============================================================================
// RESUMEN EJECUTIVO
// =============================================================================

export function generateExecutiveSummary(
  recommendations: DemandPlanningRecommendation[],
  variants: VariantWithMetrics[],
  config: DemandPlanningConfig,
): ExecutiveSummary {
  const kpis = calcKPIs(recommendations, variants, config);

  const skusWithPurchase = recommendations.filter(
    (r) => r.roundedPurchaseQuantity > 0,
  ).length;

  const narrative =
    `Con base en la demanda de los últimos ${config.demandLookbackDays} días ` +
    `y una cobertura objetivo de ${config.targetCoverageMonths} ${config.targetCoverageMonths === 1 ? 'mes' : 'meses'}, ` +
    `se recomienda comprar ${kpis.suggestedPurchaseUnits.toLocaleString('es-CO')} unidades ` +
    `distribuidas en ${skusWithPurchase} SKUs. ` +
    `Hay ${kpis.stockoutRiskHigh} productos con riesgo alto de agotarse, ` +
    `${kpis.belowMinimumStock} productos bajo el mínimo obligatorio de ${config.minimumStockBase} unidades ` +
    `y ${kpis.overstock} productos con exceso de inventario que no deberían recomprarse. ` +
    (kpis.growingDemand > 0
      ? `${kpis.growingDemand} productos muestran demanda creciente y requieren prioridad de reabastecimiento. `
      : '') +
    (kpis.decliningDemand > 0
      ? `${kpis.decliningDemand} productos con demanda decreciente deben evaluarse para promoción o liquidación. `
      : '') +
    `Los productos de alta rotación requieren mayor inventario objetivo que el mínimo base de ${config.minimumStockBase} unidades.`;

  return {
    generatedAt: new Date(),
    totalSKUs: recommendations.length,
    totalSuggestedUnits: kpis.suggestedPurchaseUnits,
    totalSuggestedSKUs: skusWithPurchase,
    highRiskStockout: kpis.stockoutRiskHigh,
    belowMinimumStock: kpis.belowMinimumStock,
    overstock: kpis.overstock,
    kpis,
    narrative,
  };
}

// =============================================================================
// EXPORTAR LISTA DE RECOMPRA (formato para Excel)
// =============================================================================

export interface ReorderListRow {
  sku: string;
  productTitle: string;
  variantTitle: string;
  vendor: string;
  availableStock: number;
  incomingStock: number;
  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;
  roundedQty: number;
  packSize: number | undefined;
  leadTimeDays: number;
  priority: string;
  recommendationType: string;
  daysOfInventory: number;
  monthsOfInventory: number;
  monthlyDemand: number;
  stockoutRisk: string;
  demandTrend: string;
  reason: string;
}

export function buildReorderList(
  recommendations: DemandPlanningRecommendation[],
): ReorderListRow[] {
  return recommendations
    .filter((r) => r.roundedPurchaseQuantity > 0)
    .map((r) => ({
      sku: r.sku,
      productTitle: r.productTitle,
      variantTitle: r.variantTitle,
      vendor: r.vendor,
      availableStock: r.availableStock,
      incomingStock: r.incomingStock,
      reorderPoint: r.reorderPoint,
      targetStock: r.targetStock,
      suggestedQty: r.suggestedPurchaseQuantity,
      roundedQty: r.roundedPurchaseQuantity,
      packSize: r.supplierPackSize,
      leadTimeDays: r.leadTimeDays,
      priority: r.priority,
      recommendationType: r.recommendationType,
      daysOfInventory: r.daysOfInventory,
      monthsOfInventory: r.monthsOfInventory,
      monthlyDemand: r.monthlyDemand,
      stockoutRisk: r.stockoutRisk,
      demandTrend: r.demandTrend,
      reason: r.reason,
    }));
}
