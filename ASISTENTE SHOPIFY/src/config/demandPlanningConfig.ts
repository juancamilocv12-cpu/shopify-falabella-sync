// =============================================================================
// DEMAND PLANNING ENGINE - CONFIGURACIÓN POR DEFECTO
// =============================================================================

import { DemandPlanningConfig } from '../types/demandPlanning';

export const defaultDemandPlanningConfig: DemandPlanningConfig = {
  // Inventario mínimo base obligatorio para todo producto activo y trackeado
  minimumStockBase: 15,

  // Meses de cobertura de demanda que el inventario debe cubrir
  targetCoverageMonths: 2,

  // Días de historial de ventas usados para calcular la demanda promedio
  demandLookbackDays: 90,

  // Safety stock como porcentaje de la demanda durante el lead time
  safetyStockPercentage: 0.2,

  // Lead time por defecto si el proveedor no tiene uno configurado
  defaultLeadTimeDays: 15,

  // Días de protección extra añadidos al punto de recompra
  reorderPointBufferDays: 5,

  // Días mínimos de historial necesarios para considerar la demanda confiable
  minSalesHistoryDays: 14,

  // Productos excluidos de reposición por tag
  excludeTags: ['discontinued', 'no-replenish', 'liquidacion', 'sample', 'muestra'],

  // Proveedores excluidos de reposición automática
  excludeVendors: [],

  // Tipos de producto excluidos de reposición
  excludeProductTypes: [],

  // Colecciones marcadas como estacionales
  seasonalCollections: [],

  // Tags que identifican productos estacionales
  seasonalTags: ['seasonal', 'temporada', 'navidad', 'verano', 'invierno'],

  // IDs de productos estratégicos que siempre deben reponerse
  strategicProductIds: [],

  // Límite global de compra máxima (0 = sin límite)
  maxPurchaseQuantity: 0,

  // Mínimo de compra global (0 = sin límite)
  minPurchaseQuantity: 0,

  // Ventas diarias ≥ highDemandThreshold → alta demanda
  highDemandThreshold: 1.0,

  // Ventas diarias ≤ lowDemandThreshold → baja demanda
  lowDemandThreshold: 0.1,

  // Factor de ajuste para productos con tendencia creciente
  growingDemandFactor: 1.25,
};

/**
 * Configuraciones predefinidas para distintos horizontes de planeación.
 * Se pueden usar directamente o mezclar con la configuración por defecto.
 */
export const demandPlanningPresets: Record<string, Partial<DemandPlanningConfig>> = {
  conservative: {
    targetCoverageMonths: 1,
    safetyStockPercentage: 0.1,
    demandLookbackDays: 30,
    growingDemandFactor: 1.1,
  },
  standard: {
    targetCoverageMonths: 2,
    safetyStockPercentage: 0.2,
    demandLookbackDays: 90,
    growingDemandFactor: 1.25,
  },
  aggressive: {
    targetCoverageMonths: 3,
    safetyStockPercentage: 0.3,
    demandLookbackDays: 180,
    growingDemandFactor: 1.5,
  },
  longCycle: {
    targetCoverageMonths: 6,
    safetyStockPercentage: 0.3,
    demandLookbackDays: 365,
    growingDemandFactor: 1.4,
  },
};

/** Combina la configuración por defecto con un preset y overrides opcionales */
export function buildConfig(
  preset: keyof typeof demandPlanningPresets = 'standard',
  overrides: Partial<DemandPlanningConfig> = {},
): DemandPlanningConfig {
  return {
    ...defaultDemandPlanningConfig,
    ...demandPlanningPresets[preset],
    ...overrides,
  };
}
