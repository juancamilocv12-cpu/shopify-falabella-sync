// =============================================================================
// ASISTENTE SHOPIFY - Entry Point
// =============================================================================

import express from 'express';
import dotenv from 'dotenv';
import demandPlanningRoutes from './routes/demandPlanningRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/demand-planning', demandPlanningRoutes);

// Exportaciones también bajo /api/export
app.use('/api/export', demandPlanningRoutes);

// Home básico para validar que la plataforma está en línea desde navegador
app.get('/', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Asistente Shopify</title>
        <style>
          :root {
            color-scheme: light;
            --bg: #f7faf8;
            --panel: #ffffff;
            --text: #1f2a2e;
            --muted: #4a5b61;
            --accent: #0f766e;
          }
          body {
            margin: 0;
            font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;
            background: radial-gradient(circle at top right, #d8efe9 0, var(--bg) 45%);
            color: var(--text);
          }
          main {
            max-width: 760px;
            margin: 48px auto;
            padding: 24px;
          }
          .card {
            background: var(--panel);
            border-radius: 14px;
            box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
            padding: 24px;
          }
          h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
          }
          p {
            margin: 0 0 14px 0;
            color: var(--muted);
            line-height: 1.45;
          }
          ul {
            margin: 0;
            padding-left: 18px;
          }
          a {
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            margin-top: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: #d1fae5;
            color: #065f46;
            font-weight: 700;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <main>
          <section class="card">
            <h1>Asistente Shopify API</h1>
            <p>La plataforma esta corriendo correctamente. Este servicio expone endpoints para planeacion de demanda, alertas y exportaciones.</p>
            <span class="badge">Estado: online</span>
            <p style="margin-top:16px">Endpoints utiles:</p>
            <ul>
              <li><a href="/health">/health</a></li>
              <li><a href="/api/demand-planning">/api/demand-planning</a></li>
              <li><a href="/api/demand-planning/reorder-list">/api/demand-planning/reorder-list</a></li>
            </ul>
          </section>
        </main>
      </body>
    </html>
  `);
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, () => {
  console.log(`🚀 Asistente Shopify corriendo en puerto ${PORT}`);
});

export default app;
