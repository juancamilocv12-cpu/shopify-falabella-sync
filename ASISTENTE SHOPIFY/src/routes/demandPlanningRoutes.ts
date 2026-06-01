// =============================================================================
// DEMAND PLANNING ROUTES
// Endpoints REST para el módulo DemandPlanningEngine
// =============================================================================

import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import {
  generateDemandPlanningRecommendations,
  generateAlerts,
  generateMarketingSignals,
  generateExecutiveSummary,
  buildReorderList,
  calcKPIs,
} from '../services/demandPlanningEngine';
import {
  DemandPlanningRecommendation,
  GenerateDemandPlanningInput,
  Priority,
  RecommendationStatus,
  RecommendationType,
  StockoutRisk,
  DemandTrend,
} from '../types/demandPlanning';
import { defaultDemandPlanningConfig, buildConfig } from '../config/demandPlanningConfig';

const router = Router();

// ─── Almacenamiento en memoria (reemplazar con Prisma en producción) ──────────
let storedRecommendations: DemandPlanningRecommendation[] = [];

function loadDemoRecommendations(): DemandPlanningRecommendation[] {
  const now = new Date();
  const daysAgo = (days: number): string => {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return d.toISOString();
  };

  const input: GenerateDemandPlanningInput = {
    products: [
      {
        id: 'demo-prod-1',
        title: 'Camiseta Basica',
        handle: 'camiseta-basica',
        vendor: 'Marca Demo',
        productType: 'Ropa',
        tags: [],
        status: 'active',
        createdAt: daysAgo(180),
        collectionIds: ['summer'],
      },
      {
        id: 'demo-prod-2',
        title: 'Tenis Running Pro',
        handle: 'tenis-running-pro',
        vendor: 'Marca Demo',
        productType: 'Calzado',
        tags: [],
        status: 'active',
        createdAt: daysAgo(240),
        collectionIds: ['sport'],
      },
      {
        id: 'demo-prod-3',
        title: 'Gorra Outlet',
        handle: 'gorra-outlet',
        vendor: 'Marca Demo',
        productType: 'Accesorios',
        tags: ['liquidacion'],
        status: 'active',
        createdAt: daysAgo(365),
        collectionIds: ['outlet'],
      },
    ],
    variants: [
      {
        id: 'demo-var-1',
        productId: 'demo-prod-1',
        title: 'Talla M',
        sku: 'DEMO-TSHIRT-M',
        price: 59000,
        inventoryItemId: 'demo-inv-1',
        cost: 28000,
      },
      {
        id: 'demo-var-2',
        productId: 'demo-prod-2',
        title: 'Talla 41',
        sku: 'DEMO-RUN-41',
        price: 189000,
        inventoryItemId: 'demo-inv-2',
        cost: 110000,
      },
      {
        id: 'demo-var-3',
        productId: 'demo-prod-3',
        title: 'Unica',
        sku: 'DEMO-CAP-ONE',
        price: 39000,
        inventoryItemId: 'demo-inv-3',
        cost: 15000,
      },
    ],
    inventoryLevels: [
      {
        variantId: 'demo-var-1',
        currentStock: 8,
        availableStock: 8,
        committedStock: 0,
        incomingStock: 0,
        tracked: true,
      },
      {
        variantId: 'demo-var-2',
        currentStock: 65,
        availableStock: 60,
        committedStock: 5,
        incomingStock: 20,
        tracked: true,
      },
      {
        variantId: 'demo-var-3',
        currentStock: 120,
        availableStock: 120,
        committedStock: 0,
        incomingStock: 0,
        tracked: true,
      },
    ],
    salesHistory: [
      {
        variantId: 'demo-var-1',
        productId: 'demo-prod-1',
        sku: 'DEMO-TSHIRT-M',
        salesData: [],
        unitsSold7Days: 16,
        unitsSold15Days: 28,
        unitsSold30Days: 54,
        unitsSold60Days: 92,
        unitsSold90Days: 126,
        unitsSold180Days: 210,
        unitsSold365Days: 390,
      },
      {
        variantId: 'demo-var-2',
        productId: 'demo-prod-2',
        sku: 'DEMO-RUN-41',
        salesData: [],
        unitsSold7Days: 8,
        unitsSold15Days: 16,
        unitsSold30Days: 32,
        unitsSold60Days: 66,
        unitsSold90Days: 95,
        unitsSold180Days: 190,
        unitsSold365Days: 360,
      },
      {
        variantId: 'demo-var-3',
        productId: 'demo-prod-3',
        sku: 'DEMO-CAP-ONE',
        salesData: [],
        unitsSold7Days: 0,
        unitsSold15Days: 0,
        unitsSold30Days: 0,
        unitsSold60Days: 1,
        unitsSold90Days: 2,
        unitsSold180Days: 3,
        unitsSold365Days: 5,
      },
    ],
    supplierConfig: [
      {
        vendor: 'Marca Demo',
        leadTimeDays: 15,
        supplierPackSize: 6,
      },
    ],
    config: defaultDemandPlanningConfig,
  };

  return generateDemandPlanningRecommendations(input);
}

// =============================================================================
// GET /api/demand-planning
// Lista todas las recomendaciones con filtros opcionales
// =============================================================================
router.get('/', (req: Request, res: Response) => {
  let results = [...storedRecommendations];

  const {
    vendor,
    collectionId,
    sku,
    productTitle,
    stockoutRisk,
    recommendationType,
    priority,
    demandTrend,
    belowMinimum,
    stockout,
    overstock,
    doNotBuy,
    status,
    page = '1',
    limit = '50',
  } = req.query as Record<string, string>;

  if (vendor) results = results.filter((r) => r.vendor.toLowerCase().includes(vendor.toLowerCase()));
  if (collectionId) results = results.filter((r) => r.collectionId === collectionId);
  if (sku) results = results.filter((r) => r.sku.toLowerCase().includes(sku.toLowerCase()));
  if (productTitle) results = results.filter((r) => r.productTitle.toLowerCase().includes(productTitle.toLowerCase()));
  if (stockoutRisk) results = results.filter((r) => r.stockoutRisk === stockoutRisk);
  if (recommendationType) results = results.filter((r) => r.recommendationType === recommendationType);
  if (priority) results = results.filter((r) => r.priority === priority);
  if (demandTrend) results = results.filter((r) => r.demandTrend === demandTrend);
  if (status) results = results.filter((r) => r.status === status);

  if (belowMinimum === 'true') {
    results = results.filter((r) => r.availableStock < r.minimumRequiredStock);
  }
  if (stockout === 'true') {
    results = results.filter((r) => r.availableStock === 0);
  }
  if (overstock === 'true') {
    results = results.filter((r) => r.recommendationType === RecommendationType.OVERSTOCK);
  }
  if (doNotBuy === 'true') {
    results = results.filter((r) => r.recommendationType === RecommendationType.DO_NOT_BUY);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const total = results.length;
  const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    total,
    page: pageNum,
    limit: limitNum,
    data: paginated,
  });
});

// =============================================================================
// GET /api/demand-planning/product/:productId
// =============================================================================
router.get('/product/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;
  const results = storedRecommendations.filter((r) => r.productId === productId);
  if (results.length === 0) {
    return res.status(404).json({ error: 'No recommendations found for this product' });
  }
  res.json(results);
});

// =============================================================================
// GET /api/demand-planning/variant/:variantId
// =============================================================================
router.get('/variant/:variantId', (req: Request, res: Response) => {
  const { variantId } = req.params;
  const rec = storedRecommendations.find((r) => r.variantId === variantId);
  if (!rec) {
    return res.status(404).json({ error: 'No recommendation found for this variant' });
  }
  res.json(rec);
});

// =============================================================================
// GET /api/demand-planning/reorder-list
// Lista de recompra filtrada (solo productos que requieren compra)
// =============================================================================
router.get('/reorder-list', (_req: Request, res: Response) => {
  const reorderList = buildReorderList(storedRecommendations);
  res.json({
    total: reorderList.length,
    data: reorderList,
  });
});

// =============================================================================
// GET /api/demand-planning/demo/load
// Carga dataset demo para probar la plataforma rápidamente
// =============================================================================
router.get('/demo/load', (_req: Request, res: Response) => {
  storedRecommendations = loadDemoRecommendations();
  const alerts = generateAlerts(storedRecommendations, defaultDemandPlanningConfig);

  res.json({
    success: true,
    message: 'Datos demo cargados correctamente',
    totalRecommendations: storedRecommendations.length,
    highPriorityAlerts: alerts.filter(
      (a) => a.priority === Priority.CRITICAL || a.priority === Priority.HIGH,
    ).length,
  });
});

// =============================================================================
// GET /api/demand-planning/dashboard
// Vista rápida en navegador para inventario, cobertura y recompra
// =============================================================================
router.get('/dashboard', (_req: Request, res: Response) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Demand Planning Dashboard</title>
        <style>
          :root {
            --bg: #f4f7f8;
            --panel: #ffffff;
            --line: #dfe7ea;
            --text: #1e2930;
            --muted: #5f7280;
            --accent: #0f766e;
            --danger: #b91c1c;
            --warn: #b45309;
            --ok: #166534;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text);
            background: linear-gradient(145deg, #e9f2ef 0%, var(--bg) 45%);
          }
          main {
            max-width: 1160px;
            margin: 0 auto;
            padding: 22px;
          }
          .top {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
          }
          h1 { margin: 0; font-size: 28px; }
          .muted { color: var(--muted); margin: 6px 0 0 0; }
          .actions { display: flex; gap: 10px; flex-wrap: wrap; }
          button, a.btn {
            border: 0;
            background: var(--accent);
            color: white;
            padding: 10px 14px;
            border-radius: 10px;
            text-decoration: none;
            cursor: pointer;
            font-weight: 700;
          }
          button.secondary, a.btn.secondary {
            background: #334155;
          }
          .panel {
            background: var(--panel);
            border-radius: 14px;
            padding: 14px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          }
          .kpis {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 10px;
            margin-bottom: 14px;
          }
          .kpi {
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 10px;
          }
          .kpi b { display: block; font-size: 22px; }
          .table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; }
          table { width: 100%; border-collapse: collapse; min-width: 960px; }
          th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; }
          th { background: #eff5f7; position: sticky; top: 0; }
          .tag { padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-block; }
          .p-critical, .p-high { color: white; background: var(--danger); }
          .p-medium { color: #fff; background: var(--warn); }
          .p-low, .p-none { color: white; background: var(--ok); }
          .empty {
            border: 1px dashed var(--line);
            padding: 18px;
            border-radius: 10px;
            color: var(--muted);
            margin-top: 12px;
          }
        </style>
      </head>
      <body>
        <main>
          <div class="top">
            <div>
              <h1>Demand Planning Dashboard</h1>
              <p class="muted">Inventarios, cobertura, riesgo de agotado y recompra sugerida por SKU.</p>
            </div>
            <div class="actions">
              <button id="loadDemo">Cargar datos demo</button>
              <button id="refresh" class="secondary">Actualizar</button>
              <a href="/api/demand-planning/reorder-list" class="btn secondary">Ver reorder-list JSON</a>
            </div>
          </div>

          <section class="panel">
            <div id="kpis" class="kpis"></div>
            <div id="empty" class="empty" style="display:none"></div>
            <div class="table-wrap" id="tableWrap" style="display:none">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Disponible</th>
                    <th>Entrante</th>
                    <th>Demanda diaria</th>
                    <th>Dias inventario</th>
                    <th>Meses inventario</th>
                    <th>Punto recompra</th>
                    <th>Objetivo</th>
                    <th>Sugerido</th>
                    <th>Redondeado</th>
                    <th>Riesgo</th>
                    <th>Tendencia</th>
                    <th>Recomendacion</th>
                    <th>Prioridad</th>
                  </tr>
                </thead>
                <tbody id="tbody"></tbody>
              </table>
            </div>
          </section>
        </main>

        <script>
          const kpisEl = document.getElementById('kpis');
          const emptyEl = document.getElementById('empty');
          const tableWrapEl = document.getElementById('tableWrap');
          const tbodyEl = document.getElementById('tbody');

          function esc(text) {
            return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          }

          function priorityClass(priority) {
            if (priority === 'critical') return 'p-critical';
            if (priority === 'high') return 'p-high';
            if (priority === 'medium') return 'p-medium';
            if (priority === 'low') return 'p-low';
            return 'p-none';
          }

          async function fetchRecommendations() {
            const res = await fetch('/api/demand-planning?limit=300');
            return res.json();
          }

          function renderKPIs(data) {
            const total = data.length;
            const buyNow = data.filter((r) => r.inventoryActionStatus === 'buy_now').length;
            const buySoon = data.filter((r) => r.inventoryActionStatus === 'buy_soon').length;
            const overstock = data.filter((r) => r.recommendationType === 'overstock').length;
            const doNotBuy = data.filter((r) => r.recommendationType === 'do_not_buy').length;

            kpisEl.innerHTML =
              '<div class="kpi"><span>Total SKUs</span><b>' + total + '</b></div>' +
              '<div class="kpi"><span>Compra urgente</span><b>' + buyNow + '</b></div>' +
              '<div class="kpi"><span>Compra proxima</span><b>' + buySoon + '</b></div>' +
              '<div class="kpi"><span>Exceso inventario</span><b>' + overstock + '</b></div>' +
              '<div class="kpi"><span>No comprar</span><b>' + doNotBuy + '</b></div>';
          }

          function renderTable(data) {
            if (!Array.isArray(data) || data.length === 0) {
              tableWrapEl.style.display = 'none';
              emptyEl.style.display = 'block';
              emptyEl.textContent = 'No hay recomendaciones cargadas. Haz clic en "Cargar datos demo" o usa POST /api/demand-planning/generate con tus datos Shopify.';
              return;
            }

            emptyEl.style.display = 'none';
            tableWrapEl.style.display = 'block';

            tbodyEl.innerHTML = data.map((r) =>
              '<tr>' +
                '<td>' + esc(r.sku) + '</td>' +
                '<td>' + esc(r.productTitle) + ' - ' + esc(r.variantTitle) + '</td>' +
                '<td>' + esc(r.availableStock) + '</td>' +
                '<td>' + esc(r.incomingStock) + '</td>' +
                '<td>' + esc(r.dailyDemand) + '</td>' +
                '<td>' + esc(r.daysOfInventory) + '</td>' +
                '<td>' + esc(r.monthsOfInventory) + '</td>' +
                '<td>' + esc(r.reorderPoint) + '</td>' +
                '<td>' + esc(r.targetStock) + '</td>' +
                '<td>' + esc(r.suggestedPurchaseQuantity) + '</td>' +
                '<td>' + esc(r.roundedPurchaseQuantity) + '</td>' +
                '<td>' + esc(r.stockoutRisk) + '</td>' +
                '<td>' + esc(r.demandTrend) + '</td>' +
                '<td>' + esc(r.recommendationType) + '</td>' +
                '<td><span class="tag ' + priorityClass(r.priority) + '">' + esc(r.priority) + '</span></td>' +
              '</tr>'
            ).join('');
          }

          async function refresh() {
            try {
              const payload = await fetchRecommendations();
              const data = payload.data || [];
              renderKPIs(data);
              renderTable(data);
            } catch (err) {
              emptyEl.style.display = 'block';
              emptyEl.textContent = 'Error cargando datos del dashboard: ' + err;
            }
          }

          document.getElementById('refresh').addEventListener('click', refresh);
          document.getElementById('loadDemo').addEventListener('click', async () => {
            await fetch('/api/demand-planning/demo/load');
            await refresh();
          });

          refresh();
        </script>
      </body>
    </html>
  `);
});

// =============================================================================
// POST /api/demand-planning/generate
// Genera nuevas recomendaciones a partir de los datos recibidos
// =============================================================================
router.post('/generate', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<GenerateDemandPlanningInput> & {
      preset?: 'conservative' | 'standard' | 'aggressive' | 'longCycle';
      configOverrides?: Record<string, unknown>;
    };

    if (!body.products || !body.variants || !body.inventoryLevels || !body.salesHistory) {
      return res.status(400).json({
        error: 'Missing required fields: products, variants, inventoryLevels, salesHistory',
      });
    }

    const config = body.config
      ? { ...defaultDemandPlanningConfig, ...body.config }
      : buildConfig(body.preset ?? 'standard', (body.configOverrides as any) ?? {});

    const input: GenerateDemandPlanningInput = {
      products: body.products,
      variants: body.variants,
      inventoryLevels: body.inventoryLevels,
      salesHistory: body.salesHistory,
      supplierConfig: body.supplierConfig ?? [],
      config,
    };

    const recommendations = generateDemandPlanningRecommendations(input);
    storedRecommendations = recommendations;

    const summary = generateExecutiveSummary(recommendations, body.variants, config);
    const alerts = generateAlerts(recommendations, config);
    const marketingSignals = generateMarketingSignals(recommendations);

    res.json({
      success: true,
      summary,
      alerts: alerts.filter(
        (a) => a.priority === Priority.CRITICAL || a.priority === Priority.HIGH,
      ),
      marketingSignals,
      totalRecommendations: recommendations.length,
    });
  } catch (err) {
    console.error('[DemandPlanningEngine] Error generating recommendations:', err);
    res.status(500).json({ error: 'Internal server error', detail: String(err) });
  }
});

// =============================================================================
// POST /api/demand-planning/:id/accept
// =============================================================================
router.post('/:id/accept', (req: Request, res: Response) => {
  const rec = storedRecommendations.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
  rec.status = RecommendationStatus.ACCEPTED;
  rec.updatedAt = new Date();
  res.json({ success: true, recommendation: rec });
});

// =============================================================================
// POST /api/demand-planning/:id/reject
// =============================================================================
router.post('/:id/reject', (req: Request, res: Response) => {
  const rec = storedRecommendations.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
  rec.status = RecommendationStatus.REJECTED;
  rec.updatedAt = new Date();
  res.json({ success: true, recommendation: rec });
});

// =============================================================================
// POST /api/demand-planning/:id/mark-ordered
// =============================================================================
router.post('/:id/mark-ordered', (req: Request, res: Response) => {
  const rec = storedRecommendations.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
  rec.status = RecommendationStatus.ORDERED;
  rec.updatedAt = new Date();
  res.json({ success: true, recommendation: rec });
});

// =============================================================================
// GET /api/export/reorder-list.xlsx
// =============================================================================
router.get('/export/reorder-list.xlsx', async (_req: Request, res: Response) => {
  try {
    const reorderList = buildReorderList(storedRecommendations);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lista de Recompra');

    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Producto', key: 'productTitle', width: 35 },
      { header: 'Variante', key: 'variantTitle', width: 20 },
      { header: 'Proveedor', key: 'vendor', width: 20 },
      { header: 'Stock Disponible', key: 'availableStock', width: 18 },
      { header: 'Entrante', key: 'incomingStock', width: 12 },
      { header: 'Punto Recompra', key: 'reorderPoint', width: 16 },
      { header: 'Inventario Objetivo', key: 'targetStock', width: 20 },
      { header: 'Cantidad Sugerida', key: 'suggestedQty', width: 18 },
      { header: 'Cantidad Redondeada', key: 'roundedQty', width: 20 },
      { header: 'Multiplo Empaque', key: 'packSize', width: 18 },
      { header: 'Lead Time (días)', key: 'leadTimeDays', width: 18 },
      { header: 'Prioridad', key: 'priority', width: 14 },
      { header: 'Recomendación', key: 'recommendationType', width: 28 },
      { header: 'Días Inventario', key: 'daysOfInventory', width: 16 },
      { header: 'Meses Inventario', key: 'monthsOfInventory', width: 18 },
      { header: 'Demanda Mensual', key: 'monthlyDemand', width: 18 },
      { header: 'Riesgo Agotado', key: 'stockoutRisk', width: 16 },
      { header: 'Tendencia', key: 'demandTrend', width: 14 },
      { header: 'Razón', key: 'reason', width: 60 },
    ];

    // Estilo encabezado
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    reorderList.forEach((row) => {
      const added = sheet.addRow(row);
      // Colorear según prioridad
      if (row.priority === Priority.CRITICAL) {
        added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      } else if (row.priority === Priority.HIGH) {
        added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
      }
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reorder-list-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Error generating Excel', detail: String(err) });
  }
});

// =============================================================================
// GET /api/export/demand-planning.xlsx
// Exportación completa de planeación de demanda
// =============================================================================
router.get('/export/demand-planning.xlsx', async (_req: Request, res: Response) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Planeación completa
    const sheet1 = workbook.addWorksheet('Planeación de Demanda');
    sheet1.columns = [
      { header: 'Producto', key: 'productTitle', width: 35 },
      { header: 'Variante', key: 'variantTitle', width: 20 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Proveedor', key: 'vendor', width: 20 },
      { header: 'Colección', key: 'collectionId', width: 20 },
      { header: 'Stock Actual', key: 'currentStock', width: 14 },
      { header: 'Disponible', key: 'availableStock', width: 14 },
      { header: 'Entrante', key: 'incomingStock', width: 12 },
      { header: 'Ventas 30d', key: 'unitsSold30Days', width: 12 },
      { header: 'Ventas 90d', key: 'unitsSold90Days', width: 12 },
      { header: 'Demanda Mensual', key: 'monthlyDemand', width: 18 },
      { header: 'Meses Inventario', key: 'monthsOfInventory', width: 18 },
      { header: 'Mín. Requerido', key: 'minimumRequiredStock', width: 16 },
      { header: 'Punto Recompra', key: 'reorderPoint', width: 16 },
      { header: 'Inv. Objetivo', key: 'targetStock', width: 14 },
      { header: 'Cant. Sugerida', key: 'suggestedPurchaseQuantity', width: 16 },
      { header: 'Cant. Redondeada', key: 'roundedPurchaseQuantity', width: 18 },
      { header: 'Riesgo Agotado', key: 'stockoutRisk', width: 16 },
      { header: 'Tendencia', key: 'demandTrend', width: 14 },
      { header: 'Recomendación', key: 'recommendationType', width: 28 },
      { header: 'Prioridad', key: 'priority', width: 14 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Acción Inventario', key: 'inventoryActionStatus', width: 20 },
      { header: 'Razón', key: 'reason', width: 60 },
    ];

    sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet1.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };

    storedRecommendations.forEach((rec) => {
      sheet1.addRow({
        productTitle: rec.productTitle,
        variantTitle: rec.variantTitle,
        sku: rec.sku,
        vendor: rec.vendor,
        collectionId: rec.collectionId ?? '',
        currentStock: rec.currentStock,
        availableStock: rec.availableStock,
        incomingStock: rec.incomingStock,
        unitsSold30Days: rec.unitsSold30Days,
        unitsSold90Days: rec.unitsSold90Days,
        monthlyDemand: rec.monthlyDemand,
        monthsOfInventory: rec.monthsOfInventory,
        minimumRequiredStock: rec.minimumRequiredStock,
        reorderPoint: rec.reorderPoint,
        targetStock: rec.targetStock,
        suggestedPurchaseQuantity: rec.suggestedPurchaseQuantity,
        roundedPurchaseQuantity: rec.roundedPurchaseQuantity,
        stockoutRisk: rec.stockoutRisk,
        demandTrend: rec.demandTrend,
        recommendationType: rec.recommendationType,
        priority: rec.priority,
        status: rec.status,
        inventoryActionStatus: rec.inventoryActionStatus,
        reason: rec.reason,
      });
    });

    // Hoja 2: KPIs
    const config = defaultDemandPlanningConfig;
    const kpis = calcKPIs(storedRecommendations, [], config);
    const sheet2 = workbook.addWorksheet('KPIs');
    sheet2.addRow(['KPI', 'Valor']);
    Object.entries(kpis).forEach(([key, value]) => {
      sheet2.addRow([key, value]);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="demand-planning-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Error generating Excel', detail: String(err) });
  }
});

export default router;
