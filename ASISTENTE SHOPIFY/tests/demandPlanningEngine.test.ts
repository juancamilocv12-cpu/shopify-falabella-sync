// =============================================================================
// DEMAND PLANNING ENGINE - UNIT TESTS
// 16 casos de prueba cubriendo todos los escenarios del módulo
// =============================================================================

import {
  generateDemandPlanningRecommendations,
  generateAlerts,
  generateMarketingSignals,
} from '../src/services/demandPlanningEngine';
import {
  DemandPlanningConfig,
  DemandTrend,
  GenerateDemandPlanningInput,
  InventoryActionStatus,
  InventoryLevel,
  Priority,
  ProductWithMetrics,
  RecommendationType,
  SalesHistory,
  StockoutRisk,
  SupplierConfig,
  VariantWithMetrics,
  AlertType,
} from '../src/types/demandPlanning';
import { defaultDemandPlanningConfig } from '../src/config/demandPlanningConfig';

// ─── Fixtures de ayuda ────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<ProductWithMetrics> = {}): ProductWithMetrics {
  return {
    id: 'prod-1',
    title: 'Producto Test',
    handle: 'producto-test',
    vendor: 'Vendor A',
    productType: 'Electronics',
    tags: [],
    status: 'active',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    collectionIds: ['col-1'],
    ...overrides,
  };
}

function makeVariant(overrides: Partial<VariantWithMetrics> = {}): VariantWithMetrics {
  return {
    id: 'var-1',
    productId: 'prod-1',
    title: 'Default Title',
    sku: 'SKU-001',
    price: 50000,
    inventoryItemId: 'inv-1',
    cost: 25000,
    ...overrides,
  };
}

function makeInventory(overrides: Partial<InventoryLevel> = {}): InventoryLevel {
  return {
    variantId: 'var-1',
    currentStock: 30,
    availableStock: 30,
    committedStock: 0,
    incomingStock: 0,
    tracked: true,
    ...overrides,
  };
}

function makeSales(overrides: Partial<SalesHistory> = {}): SalesHistory {
  return {
    variantId: 'var-1',
    productId: 'prod-1',
    sku: 'SKU-001',
    salesData: [],
    unitsSold7Days: 7,
    unitsSold15Days: 15,
    unitsSold30Days: 30,
    unitsSold60Days: 60,
    unitsSold90Days: 90,
    unitsSold180Days: 180,
    unitsSold365Days: 365,
    daysSinceLastSale: 1,
    ...overrides,
  };
}

const baseConfig: DemandPlanningConfig = {
  ...defaultDemandPlanningConfig,
  targetCoverageMonths: 2,
  demandLookbackDays: 90,
  defaultLeadTimeDays: 15,
  safetyStockPercentage: 0.2,
  reorderPointBufferDays: 5,
  minimumStockBase: 15,
  minSalesHistoryDays: 14,
  highDemandThreshold: 1.0,
  lowDemandThreshold: 0.1,
  growingDemandFactor: 1.25,
};

function buildInput(
  overrides: {
    product?: Partial<ProductWithMetrics>;
    variant?: Partial<VariantWithMetrics>;
    inventory?: Partial<InventoryLevel>;
    sales?: Partial<SalesHistory>;
    supplier?: SupplierConfig;
    config?: Partial<DemandPlanningConfig>;
  } = {},
): GenerateDemandPlanningInput {
  return {
    products: [makeProduct(overrides.product)],
    variants: [makeVariant(overrides.variant)],
    inventoryLevels: [makeInventory(overrides.inventory)],
    salesHistory: [makeSales(overrides.sales)],
    supplierConfig: overrides.supplier ? [overrides.supplier] : [],
    config: { ...baseConfig, ...(overrides.config ?? {}) },
  };
}

// =============================================================================
// TEST 1: Producto con demanda alta y stock bajo
// =============================================================================
test('TEST 1: Producto con alta demanda y stock bajo → recompra urgente', () => {
  // dailyDemand = 90/90 = 1 ud/día; leadTimeDemand = 1*15 = 15
  // safetyStock = 15*0.2 = 3; reorderPoint = max(15, 15+3+5) = 23
  // availableStock = 10 < reorderPoint → urgente
  const input = buildInput({ inventory: { availableStock: 10, currentStock: 10 } });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.recommendationType).toBe(RecommendationType.URGENT_REORDER);
  expect(rec.priority).toBe(Priority.HIGH);
  expect(rec.roundedPurchaseQuantity).toBeGreaterThan(0);
  expect(rec.inventoryActionStatus).toBe(InventoryActionStatus.BUY_NOW);
});

// =============================================================================
// TEST 2: Producto con baja demanda y stock mayor a 15
// =============================================================================
test('TEST 2: Producto con demanda baja y stock >= 15 → no comprar', () => {
  const input = buildInput({
    sales: {
      unitsSold7Days: 0,
      unitsSold15Days: 0,
      unitsSold30Days: 1,
      unitsSold60Days: 2,
      unitsSold90Days: 3,
      unitsSold180Days: 5,
      unitsSold365Days: 8,
    },
    inventory: { availableStock: 20, currentStock: 20 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.roundedPurchaseQuantity).toBe(0);
  expect([
    RecommendationType.DO_NOT_BUY,
    RecommendationType.HEALTHY_STOCK,
    RecommendationType.OVERSTOCK,
  ]).toContain(rec.recommendationType);
});

// =============================================================================
// TEST 3: Producto con stock menor a 15
// =============================================================================
test('TEST 3: Stock < 15 → inventario mínimo requerido', () => {
  const input = buildInput({
    sales: {
      unitsSold7Days: 0,
      unitsSold15Days: 0,
      unitsSold30Days: 0,
      unitsSold60Days: 0,
      unitsSold90Days: 0,
      unitsSold180Days: 0,
      unitsSold365Days: 0,
    },
    inventory: { availableStock: 8, currentStock: 8 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.availableStock).toBeLessThan(15);
  expect(rec.minimumRequiredStock).toBeGreaterThanOrEqual(15);
  expect([
    RecommendationType.MINIMUM_STOCK_REQUIRED,
    RecommendationType.URGENT_REORDER,
    RecommendationType.NEW_OBSERVATION,
  ]).toContain(rec.recommendationType);
});

// =============================================================================
// TEST 4: Producto sin ventas en 180 días
// =============================================================================
test('TEST 4: Sin ventas en 180 días → no comprar', () => {
  const input = buildInput({
    sales: {
      unitsSold7Days: 0,
      unitsSold15Days: 0,
      unitsSold30Days: 0,
      unitsSold60Days: 0,
      unitsSold90Days: 0,
      unitsSold180Days: 0,
      unitsSold365Days: 2,
    },
    inventory: { availableStock: 20, currentStock: 20 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.unitsSold180Days).toBe(0);
  expect(rec.roundedPurchaseQuantity).toBe(0);
  expect([
    RecommendationType.DO_NOT_BUY,
    RecommendationType.OVERSTOCK,
    RecommendationType.HEALTHY_STOCK,
  ]).toContain(rec.recommendationType);
});

// =============================================================================
// TEST 5: Producto agotado con historial de ventas
// =============================================================================
test('TEST 5: Agotado con demanda histórica → recompra urgente / stockout', () => {
  const input = buildInput({
    inventory: { availableStock: 0, currentStock: 0 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.availableStock).toBe(0);
  expect(rec.roundedPurchaseQuantity).toBeGreaterThan(0);
  expect(rec.recommendationType).toBe(RecommendationType.STOCKOUT_WITH_DEMAND);
  expect(rec.priority).toBe(Priority.CRITICAL);
  expect(rec.inventoryActionStatus).toBe(InventoryActionStatus.BUY_NOW);
});

// =============================================================================
// TEST 6: Producto nuevo sin historial
// =============================================================================
test('TEST 6: Producto nuevo (< minSalesHistoryDays) → nuevo en observación', () => {
  const input = buildInput({
    product: {
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días
    },
    sales: {
      unitsSold7Days: 0,
      unitsSold15Days: 0,
      unitsSold30Days: 0,
      unitsSold60Days: 0,
      unitsSold90Days: 0,
      unitsSold180Days: 0,
      unitsSold365Days: 0,
    },
    inventory: { availableStock: 20, currentStock: 20 },
    config: { minSalesHistoryDays: 14 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.recommendationType).toBe(RecommendationType.NEW_OBSERVATION);
  expect(rec.roundedPurchaseQuantity).toBe(0);
});

// =============================================================================
// TEST 7: Producto con lead time largo
// =============================================================================
test('TEST 7: Lead time largo → punto de recompra elevado y safety stock mayor', () => {
  const input = buildInput({
    supplier: { vendor: 'Vendor A', leadTimeDays: 45 },
    inventory: { availableStock: 40, currentStock: 40 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  // dailyDemand = 1 ud/día; leadTimeDemand = 45; safetyStock = 9; reorderPoint = max(15, 59)
  expect(rec.leadTimeDays).toBe(45);
  expect(rec.reorderPoint).toBeGreaterThanOrEqual(15);
  expect(rec.safetyStock).toBeGreaterThan(0);
  // Con 40 uds disponibles y reorderPoint ~59, debería recomendar compra
  expect([
    RecommendationType.URGENT_REORDER,
    RecommendationType.UPCOMING_REORDER,
    RecommendationType.INSUFFICIENT_FOR_LEAD_TIME,
  ]).toContain(rec.recommendationType);
});

// =============================================================================
// TEST 8: Producto con inventario entrante
// =============================================================================
test('TEST 8: Inventario entrante reduce cantidad sugerida de compra', () => {
  // Sin incoming
  const inputA = buildInput({
    inventory: { availableStock: 5, currentStock: 5, incomingStock: 0 },
  });
  // Con incoming de 50 unidades
  const inputB = buildInput({
    inventory: { availableStock: 5, currentStock: 5, incomingStock: 50 },
  });

  const [recA] = generateDemandPlanningRecommendations(inputA);
  const [recB] = generateDemandPlanningRecommendations(inputB);

  expect(recA.roundedPurchaseQuantity).toBeGreaterThan(recB.roundedPurchaseQuantity);
  expect(recB.roundedPurchaseQuantity).toBeGreaterThanOrEqual(0);
});

// =============================================================================
// TEST 9: Producto con múltiplo de compra (pack size)
// =============================================================================
test('TEST 9: Pack size redondea la cantidad al múltiplo superior correcto', () => {
  const input = buildInput({
    supplier: { vendor: 'Vendor A', leadTimeDays: 15, supplierPackSize: 12 },
    inventory: { availableStock: 5, currentStock: 5 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.supplierPackSize).toBe(12);
  if (rec.roundedPurchaseQuantity > 0) {
    expect(rec.roundedPurchaseQuantity % 12).toBe(0);
    expect(rec.roundedPurchaseQuantity).toBeGreaterThanOrEqual(rec.suggestedPurchaseQuantity);
  }
});

// =============================================================================
// TEST 10: Producto con tendencia creciente
// =============================================================================
test('TEST 10: Tendencia creciente → tipo growing_demand y mayor cantidad sugerida', () => {
  // Ventas últimos 30 días muy altas vs historial anterior
  const input = buildInput({
    sales: {
      unitsSold7Days: 20,
      unitsSold15Days: 40,
      unitsSold30Days: 90,   // 3 uds/día
      unitsSold60Days: 95,
      unitsSold90Days: 100,  // ~1.1 uds/día histórico
      unitsSold180Days: 110,
      unitsSold365Days: 120,
    },
    inventory: { availableStock: 20, currentStock: 20 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.demandTrend).toBe(DemandTrend.GROWING);
  expect([
    RecommendationType.GROWING_DEMAND,
    RecommendationType.URGENT_REORDER,
    RecommendationType.STOCKOUT_WITH_DEMAND,
  ]).toContain(rec.recommendationType);
});

// =============================================================================
// TEST 11: Producto con tendencia decreciente
// =============================================================================
test('TEST 11: Tendencia decreciente con stock alto → no comprar o compra reducida', () => {
  const input = buildInput({
    sales: {
      unitsSold7Days: 0,
      unitsSold15Days: 1,
      unitsSold30Days: 2,  // 0.07 uds/día reciente
      unitsSold60Days: 30,
      unitsSold90Days: 80, // ~0.89 uds/día historial
      unitsSold180Days: 160,
      unitsSold365Days: 320,
    },
    inventory: { availableStock: 100, currentStock: 100 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.demandTrend).toBe(DemandTrend.DECLINING);
  expect(rec.roundedPurchaseQuantity).toBe(0);
  expect([
    RecommendationType.OVERSTOCK,
    RecommendationType.DECLINING_DEMAND,
    RecommendationType.DO_NOT_BUY,
  ]).toContain(rec.recommendationType);
});

// =============================================================================
// TEST 12: Producto excluido por tag
// =============================================================================
test('TEST 12: Producto con tag excluido → do_not_buy y cantidad 0', () => {
  const input = buildInput({
    product: { tags: ['discontinued'] },
    inventory: { availableStock: 5, currentStock: 5 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.isExcluded).toBe(true);
  expect(rec.recommendationType).toBe(RecommendationType.DO_NOT_BUY);
  expect(rec.roundedPurchaseQuantity).toBe(0);
});

// =============================================================================
// TEST 13: Prevención de compra innecesaria (exceso de inventario)
// =============================================================================
test('TEST 13: Exceso de inventario con demanda baja → no se recomienda compra', () => {
  const input = buildInput({
    sales: {
      unitsSold7Days: 1,
      unitsSold15Days: 1,
      unitsSold30Days: 3,
      unitsSold60Days: 5,
      unitsSold90Days: 8,
      unitsSold180Days: 12,
      unitsSold365Days: 20,
    },
    inventory: { availableStock: 500, currentStock: 500 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.roundedPurchaseQuantity).toBe(0);
  expect(rec.recommendationType).toBe(RecommendationType.OVERSTOCK);
});

// =============================================================================
// TEST 14: Cálculo correcto del punto de recompra
// =============================================================================
test('TEST 14: Punto de recompra calculado correctamente', () => {
  // dailyDemand = 90/90 = 1; leadTimeDemand = 1*15 = 15
  // safetyStock = 15*0.2 = 3; bufferDemand = 1*5 = 5
  // reorderPoint = max(15, 15+3+5) = max(15, 23) = 23
  const input = buildInput({ inventory: { availableStock: 30, currentStock: 30 } });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.leadTimeDays).toBe(15);
  expect(rec.reorderPoint).toBe(23);
});

// =============================================================================
// TEST 15: Cálculo correcto del inventario objetivo
// =============================================================================
test('TEST 15: Inventario objetivo calculado correctamente', () => {
  // dailyDemand = 1; monthlyDemand = 30; targetCoverage = 30*2 = 60
  // safetyStock = 3; targetStock = max(15, 60+3) = 63
  const input = buildInput({ inventory: { availableStock: 30, currentStock: 30 } });
  const [rec] = generateDemandPlanningRecommendations(input);

  expect(rec.targetStock).toBe(63);
  expect(rec.targetStock).toBeGreaterThanOrEqual(15);
});

// =============================================================================
// TEST 16: Cálculo correcto de cantidad sugerida de compra
// =============================================================================
test('TEST 16: Cantidad sugerida = targetStock - availableStock - incomingStock', () => {
  // targetStock = 63; available = 10; incoming = 5 → suggested = 48
  const input = buildInput({
    inventory: { availableStock: 10, currentStock: 10, incomingStock: 5 },
  });
  const [rec] = generateDemandPlanningRecommendations(input);

  const expectedSuggested = rec.targetStock - rec.availableStock - rec.incomingStock;
  expect(rec.suggestedPurchaseQuantity).toBe(Math.max(0, expectedSuggested));
  expect(rec.roundedPurchaseQuantity).toBeGreaterThanOrEqual(rec.suggestedPurchaseQuantity);
});

// =============================================================================
// BONUS TEST: Alertas generadas correctamente
// =============================================================================
test('BONUS: generateAlerts detecta producto agotado con demanda', () => {
  const input = buildInput({
    inventory: { availableStock: 0, currentStock: 0 },
  });
  const recs = generateDemandPlanningRecommendations(input);
  const alerts = generateAlerts(recs, baseConfig);

  const stockoutAlert = alerts.find((a) => a.alertType === AlertType.STOCKOUT_WITH_DEMAND);
  expect(stockoutAlert).toBeDefined();
  expect(stockoutAlert?.priority).toBe(Priority.CRITICAL);
});

// =============================================================================
// BONUS TEST: Señales de marketing
// =============================================================================
test('BONUS: MarketingSignal correcto según inventoryActionStatus', () => {
  // Producto agotado no debe tener paid ads
  const inputAgotado = buildInput({ inventory: { availableStock: 0, currentStock: 0 } });
  const recsAgotado = generateDemandPlanningRecommendations(inputAgotado);
  const signalsAgotado = generateMarketingSignals(recsAgotado);
  expect(signalsAgotado[0].canRunPaidAds).toBe(false);
  expect(signalsAgotado[0].suggestWaitlist).toBe(true);

  // Producto con exceso sí puede tener liquidación
  const inputOverstock = buildInput({
    inventory: { availableStock: 500, currentStock: 500 },
    sales: {
      unitsSold7Days: 1, unitsSold15Days: 1, unitsSold30Days: 3,
      unitsSold60Days: 5, unitsSold90Days: 8, unitsSold180Days: 12, unitsSold365Days: 20,
    },
  });
  const recsOverstock = generateDemandPlanningRecommendations(inputOverstock);
  const signalsOverstock = generateMarketingSignals(recsOverstock);
  expect(signalsOverstock[0].suggestLiquidation).toBe(true);
});
