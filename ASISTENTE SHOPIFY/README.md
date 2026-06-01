# Asistente Shopify — Módulo DemandPlanningEngine

Motor inteligente de planeación de demanda, reabastecimiento y cobertura de inventario para tiendas Shopify.

## Plataforma web administrativa

El repositorio ahora incluye un frontend completo en Next.js dentro de [web](web) para visualizar y accionar módulos de:

- Dashboard general
- Inventario
- Ventas
- Baja rotación
- Sobrestock
- Agotados
- Planeación de demanda
- Recompras sugeridas
- Estrategias de mercadeo
- Colecciones
- Productos
- Proveedores / marcas
- Alertas
- Exportaciones
- Configuración

### Stack del frontend

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Componentes UI reutilizables estilo shadcn/ui
- TanStack Table
- Recharts
- Prisma preparado para PostgreSQL
- API routes internas con mocks realistas reemplazables por Prisma

### Ejecutar frontend

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Abrir:

- `http://localhost:3001/login` si corres el frontend en otro puerto
- `http://localhost:3000/login` si usas el puerto por defecto libre para Next

Credenciales demo:

- email: `admin@shopify.local`
- password: `admin123`

### Endpoints internos del frontend

El frontend expone endpoints mock-ready para alimentar tablas, KPIs y gráficos:

- `/api/dashboard/summary`
- `/api/dashboard/charts`
- `/api/inventory`
- `/api/sales`
- `/api/low-rotation`
- `/api/overstock`
- `/api/stockouts`
- `/api/demand-planning`
- `/api/reorder-list`
- `/api/marketing-strategies`
- `/api/products`
- `/api/products/:id`
- `/api/collections`
- `/api/collections/:id`
- `/api/vendors`
- `/api/vendors/:vendor`
- `/api/alerts`
- `/api/alerts/:id/resolve`
- `/api/recommendations/:id/accept`
- `/api/recommendations/:id/reject`
- `/api/recommendations/:id/execute`
- `/api/exports/:type`

### Reemplazar mocks por Prisma

La capa de datos mock está centralizada en:

- [web/src/lib/mock-data.ts](web/src/lib/mock-data.ts)
- [web/src/lib/dashboard-service.ts](web/src/lib/dashboard-service.ts)

Cuando la base real esté lista, reemplaza esas lecturas por consultas Prisma usando:

- [web/src/lib/prisma.ts](web/src/lib/prisma.ts)
- [web/prisma/schema.prisma](web/prisma/schema.prisma)

---

## Tabla de contenido

- [Descripción general](#descripción-general)
- [Instalación](#instalación)
- [Cómo se calcula la demanda](#cómo-se-calcula-la-demanda)
- [Mínimo obligatorio de 15 unidades](#mínimo-obligatorio-de-15-unidades)
- [Cómo configurar meses de cobertura](#cómo-configurar-meses-de-cobertura)
- [Cómo configurar lead time por proveedor](#cómo-configurar-lead-time-por-proveedor)
- [Punto de recompra](#punto-de-recompra)
- [Inventario objetivo](#inventario-objetivo)
- [Cantidad sugerida de compra](#cantidad-sugerida-de-compra)
- [Cómo evitar compras innecesarias](#cómo-evitar-compras-innecesarias)
- [Cómo exportar la lista de recompra](#cómo-exportar-la-lista-de-recompra)
- [Endpoints disponibles](#endpoints-disponibles)
- [Integración con MarketingStrategyEngine](#integración-con-marketingstrategyengine)
- [Clasificaciones del módulo](#clasificaciones-del-módulo)
- [Alertas automáticas](#alertas-automáticas)
- [Configuración avanzada](#configuración-avanzada)
- [Pruebas unitarias](#pruebas-unitarias)

---

## Descripción general

`DemandPlanningEngine` responde preguntas clave del negocio:

| Pregunta | Cómo la responde el módulo |
|---|---|
| ¿Cuánto inventario debería tener? | `targetStock` |
| ¿Cuánto debo comprar? | `roundedPurchaseQuantity` |
| ¿Cuándo se va a agotar? | `daysOfInventory` |
| ¿Cuántos meses de inventario tengo? | `monthsOfInventory` |
| ¿Qué productos requieren recompra urgente? | `recommendationType = urgent_reorder` |
| ¿Qué productos no deben comprarse? | `recommendationType = do_not_buy` |
| ¿Qué productos tienen exceso? | `recommendationType = overstock` |
| ¿Qué productos tienen demanda creciente? | `demandTrend = growing` |

---

## Instalación

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Crea un archivo `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/asistente_shopify"
PORT=3000
```

---

## Cómo se calcula la demanda

El motor usa el historial de ventas del período configurado (`demandLookbackDays`, por defecto 90 días):

```
dailyDemand = unitsSoldInPeriod / demandLookbackDays
weeklyDemand = dailyDemand × 7
monthlyDemand = dailyDemand × 30
```

Si el producto tiene **tendencia creciente** (ventas últimos 30 días > 120% del promedio histórico), la demanda diaria se ajusta multiplicando por `growingDemandFactor` (por defecto `1.25`).

### Períodos disponibles para lookback

| `demandLookbackDays` | Recomendado para |
|---|---|
| 30 | Productos muy volátiles o nuevos |
| 60 | Temporadas cortas |
| 90 | **Uso estándar** (default) |
| 180 | Productos con ciclo largo |
| 365 | Productos con estacionalidad anual |

---

## Mínimo obligatorio de 15 unidades

Todo producto **activo**, **trackeado** y **no excluido** debe mantener al menos 15 unidades disponibles.

```
minimumRequiredStock = max(15, leadTimeDemand + safetyStock)
```

Esto garantiza que aunque la demanda sea muy baja o nula, siempre se recomienda un piso mínimo de inventario. La variable `minimumStockBase` (por defecto `15`) es configurable.

**Excepciones:**
- Productos con tags excluidos (e.g., `discontinued`, `no-replenish`).
- Productos de proveedores excluidos.
- Productos de tipos excluidos.
- Productos sin inventario trackeado.
- Productos no activos (draft, archived).

---

## Cómo configurar meses de cobertura

En `src/config/demandPlanningConfig.ts` o al llamar la API:

```typescript
import { buildConfig } from './src/config/demandPlanningConfig';

const config = buildConfig('standard', {
  targetCoverageMonths: 3, // cubrir 3 meses de demanda
});
```

O con presets:

| Preset | `targetCoverageMonths` | `safetyStockPercentage` | Uso recomendado |
|---|---|---|---|
| `conservative` | 1 | 10% | Liquidez limitada o alta rotación |
| `standard` | 2 | 20% | **Operación normal** |
| `aggressive` | 3 | 30% | Productos estratégicos |
| `longCycle` | 6 | 30% | Importaciones o temporadas largas |

Vía API:

```http
POST /api/demand-planning/generate
Content-Type: application/json

{
  "preset": "aggressive",
  "products": [...],
  "variants": [...],
  ...
}
```

---

## Cómo configurar lead time por proveedor

En el campo `supplierConfig` del request:

```json
{
  "supplierConfig": [
    {
      "vendor": "Proveedor Nacional",
      "leadTimeDays": 7,
      "supplierPackSize": 6
    },
    {
      "vendor": "Importador Asia",
      "leadTimeDays": 45,
      "supplierPackSize": 24,
      "minPurchaseQuantity": 48
    }
  ]
}
```

Si un proveedor no tiene configuración, se usa `defaultLeadTimeDays` (15 días por defecto).

---

## Punto de recompra

El punto de recompra indica cuándo **debe generarse la orden de compra** para no quedarse sin stock durante el tiempo de entrega del proveedor:

```
leadTimeDemand = dailyDemand × leadTimeDays
safetyStock    = leadTimeDemand × safetyStockPercentage
bufferDemand   = dailyDemand × reorderPointBufferDays

reorderPoint = max(15, leadTimeDemand + safetyStock + bufferDemand)
```

**Ejemplo:**
- `dailyDemand = 2 uds/día`
- `leadTimeDays = 15 días`
- `safetyStockPercentage = 0.20 (20%)`
- `reorderPointBufferDays = 5 días`

```
leadTimeDemand = 2 × 15 = 30
safetyStock    = 30 × 0.20 = 6
bufferDemand   = 2 × 5 = 10
reorderPoint   = max(15, 30 + 6 + 10) = 46
```

Cuando `availableStock ≤ 46`, el sistema genera alerta y recomendación de recompra.

---

## Inventario objetivo

Es la cantidad de unidades que debería tener el producto para cubrir la demanda durante los meses configurados más el safety stock:

```
targetDemandCoverage = monthlyDemand × targetCoverageMonths
targetStock          = max(15, targetDemandCoverage + safetyStock)
```

**Ejemplo con 2 meses de cobertura:**
- `monthlyDemand = 60 uds`
- `targetCoverageMonths = 2`
- `safetyStock = 6`

```
targetDemandCoverage = 60 × 2 = 120
targetStock          = max(15, 120 + 6) = 126
```

---

## Cantidad sugerida de compra

```
suggestedPurchaseQuantity = targetStock - availableStock - incomingStock
```

Si el resultado es negativo (hay exceso), se devuelve `0`.

Si hay `supplierPackSize`, se redondea al múltiplo superior:

**Ejemplo:** `suggestedQty = 17`, `supplierPackSize = 12` → `roundedQty = 24`

```
roundedQty = ceil(17 / 12) × 12 = 2 × 12 = 24
```

---

## Cómo evitar compras innecesarias

El motor aplica las siguientes reglas para **no recomendar compra**:

1. **Producto excluido** por tag, proveedor o tipo → `do_not_buy`, cantidad `0`.
2. **Sin ventas en 180 días** y stock suficiente → `do_not_buy` o `overstock`.
3. **Tendencia decreciente** con stock alto → no comprar o compra reducida.
4. **Exceso de inventario** (`availableStock > targetStock × 1.5`) → `overstock`, cantidad `0`.
5. **Demanda cero** con stock ≥ 15 → `do_not_buy` (excepto productos estratégicos).
6. **Producto nuevo** sin historial suficiente → solo stock mínimo base.

---

## Cómo exportar la lista de recompra

### Excel — solo productos a comprar

```http
GET /api/export/reorder-list.xlsx
```

Genera un archivo `.xlsx` con todas las variantes que requieren recompra, coloreado por prioridad.

### Excel — planeación completa

```http
GET /api/export/demand-planning.xlsx
```

Incluye dos hojas: planeación completa + KPIs del dashboard.

---

## Endpoints disponibles

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/demand-planning` | Listar recomendaciones con filtros |
| `GET` | `/api/demand-planning/product/:productId` | Recomendaciones por producto |
| `GET` | `/api/demand-planning/variant/:variantId` | Recomendación por variante |
| `GET` | `/api/demand-planning/reorder-list` | Lista de recompra activa |
| `POST` | `/api/demand-planning/generate` | Generar nuevas recomendaciones |
| `POST` | `/api/demand-planning/:id/accept` | Aceptar recomendación |
| `POST` | `/api/demand-planning/:id/reject` | Rechazar recomendación |
| `POST` | `/api/demand-planning/:id/mark-ordered` | Marcar como ordenado |
| `GET` | `/api/export/reorder-list.xlsx` | Exportar lista de recompra |
| `GET` | `/api/export/demand-planning.xlsx` | Exportar planeación completa |

### Filtros disponibles en GET /api/demand-planning

| Parámetro | Valores | Ejemplo |
|---|---|---|
| `vendor` | Texto libre | `vendor=Adidas` |
| `sku` | Texto libre | `sku=SKU-001` |
| `stockoutRisk` | `high`, `medium`, `low`, `none` | `stockoutRisk=high` |
| `recommendationType` | Ver clasificaciones | `recommendationType=urgent_reorder` |
| `priority` | `critical`, `high`, `medium`, `low`, `none` | `priority=critical` |
| `demandTrend` | `growing`, `stable`, `declining`, `no_data` | `demandTrend=growing` |
| `belowMinimum` | `true` | `belowMinimum=true` |
| `stockout` | `true` | `stockout=true` |
| `overstock` | `true` | `overstock=true` |
| `doNotBuy` | `true` | `doNotBuy=true` |
| `status` | `pending`, `accepted`, `rejected`, `ordered` | `status=pending` |

---

## Integración con MarketingStrategyEngine

El campo `inventoryActionStatus` es el puente entre ambos módulos:

| `inventoryActionStatus` | Acción de mercadeo permitida |
|---|---|
| `buy_now` | ❌ No pauta agresiva. Sugerir waitlist. |
| `buy_soon` | ⚠️ Pauta limitada. Email a lista existente. |
| `healthy` | ✅ Pauta normal, homepage, email marketing. |
| `overstock` | 📦 Descuento, bundle, liquidación. |
| `do_not_buy` | 🔄 Si hay stock: liquidar. Sin stock: sin acción. |
| `stockout_risk` | ⏸️ Pausar campañas que incrementen demanda. |
| `new_observation` | 🆕 Campañas pequeñas para medir demanda. |

---

## Clasificaciones del módulo

| `recommendationType` | Significado |
|---|---|
| `urgent_reorder` | Recompra urgente inmediata |
| `upcoming_reorder` | Programar recompra próxima |
| `healthy_stock` | Stock suficiente, no comprar |
| `minimum_stock_required` | Stock bajo el mínimo obligatorio |
| `overstock` | Exceso de inventario |
| `do_not_buy` | No comprar por exclusión o baja rotación |
| `new_observation` | Producto nuevo sin historial |
| `growing_demand` | Demanda creciente, recompra anticipada |
| `declining_demand` | Demanda decreciente, reducir compra |
| `stockout_risk` | Riesgo inminente de agotado |
| `stockout_with_demand` | Agotado con historial positivo |
| `insufficient_for_lead_time` | Stock no cubre lead time del proveedor |

---

## Alertas automáticas

El sistema genera alertas automáticas para:

- 📛 Stock menor a 15 unidades (`below_minimum_stock`)
- ⚠️ Stock menor al punto de recompra (`below_reorder_point`)
- ⏱️ Días de inventario menor al lead time (`inventory_below_lead_time`)
- 🔴 Producto agotado con demanda (`stockout_with_demand`)
- 📈 Demanda creciente con stock insuficiente (`growing_demand_low_stock`)
- 🚨 Compra urgente sugerida (`urgent_purchase_suggested`)
- ✅ Inventario saludable, no comprar (`healthy_do_not_buy`)

---

## Configuración avanzada

```typescript
// src/config/demandPlanningConfig.ts
const config: DemandPlanningConfig = {
  minimumStockBase: 15,          // Mínimo base obligatorio
  targetCoverageMonths: 2,       // Meses de cobertura objetivo
  demandLookbackDays: 90,        // Días de historial para demanda
  safetyStockPercentage: 0.20,   // 20% safety stock
  defaultLeadTimeDays: 15,       // Lead time por defecto
  reorderPointBufferDays: 5,     // Buffer extra al punto de recompra
  minSalesHistoryDays: 14,       // Días mínimos para historial confiable
  excludeTags: ['discontinued', 'no-replenish'],
  excludeVendors: [],
  excludeProductTypes: [],
  seasonalCollections: [],
  seasonalTags: ['temporada', 'seasonal'],
  strategicProductIds: [],       // IDs siempre reponibles
  maxPurchaseQuantity: 0,        // 0 = sin límite
  minPurchaseQuantity: 0,        // 0 = sin límite
  highDemandThreshold: 1.0,      // uds/día para alta rotación
  lowDemandThreshold: 0.1,       // uds/día para baja rotación
  growingDemandFactor: 1.25,     // Multiplicador para demanda creciente
};
```

---

## Pruebas unitarias

```bash
npm test
npm run test:coverage
```

Los tests cubren:

| # | Escenario |
|---|---|
| 1 | Demanda alta y stock bajo → recompra urgente |
| 2 | Demanda baja y stock ≥ 15 → no comprar |
| 3 | Stock < 15 → mínimo requerido |
| 4 | Sin ventas en 180 días → no comprar |
| 5 | Producto agotado con historial → recompra urgente |
| 6 | Producto nuevo sin historial → observación |
| 7 | Lead time largo → punto de recompra elevado |
| 8 | Inventario entrante reduce cantidad sugerida |
| 9 | Pack size redondea al múltiplo correcto |
| 10 | Tendencia creciente → growing_demand |
| 11 | Tendencia decreciente con stock alto → no comprar |
| 12 | Tag excluido → do_not_buy |
| 13 | Exceso de inventario → no comprar |
| 14 | Cálculo correcto del punto de recompra |
| 15 | Cálculo correcto del inventario objetivo |
| 16 | Cálculo correcto de cantidad sugerida |
| BONUS | Alertas de agotado con demanda |
| BONUS | Señales de marketing correctas por status |

---

## Estructura del proyecto

```
src/
  types/
    demandPlanning.ts        ← Interfaces, enums y tipos
  config/
    demandPlanningConfig.ts  ← Configuración por defecto y presets
  services/
    demandPlanningEngine.ts  ← Motor principal de cálculos
  routes/
    demandPlanningRoutes.ts  ← Endpoints REST + exportación Excel
  index.ts                   ← Entry point Express
prisma/
  schema.prisma              ← Modelo DemandPlanningRecommendation
tests/
  demandPlanningEngine.test.ts ← 16+ pruebas unitarias
```
