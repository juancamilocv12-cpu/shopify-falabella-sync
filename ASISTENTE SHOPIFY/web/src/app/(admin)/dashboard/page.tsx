"use client";

import * as React from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertList,
  ChartCard,
  ExecutiveSummaryCard,
  KPIGrid,
  PriorityBadge,
  StrategyRecommendationCard,
} from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const pieColors = ["#15803d", "#d97706", "#dc2626", "#7c3aed", "#475569"];

export default function DashboardPage() {
  const [summary, setSummary] = React.useState<any>(null);
  const [charts, setCharts] = React.useState<any>(null);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [urgent, setUrgent] = React.useState<any[]>([]);
  const [strategies, setStrategies] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function load() {
      const [summaryRes, chartsRes, alertsRes, urgentRes, strategiesRes] = await Promise.all([
        fetch("/api/dashboard/summary", { cache: "no-store" }),
        fetch("/api/dashboard/charts", { cache: "no-store" }),
        fetch("/api/alerts?page=1&pageSize=5", { cache: "no-store" }),
        fetch("/api/demand-planning?page=1&pageSize=6&sortBy=priority", { cache: "no-store" }),
        fetch("/api/marketing-strategies?page=1&pageSize=4", { cache: "no-store" }),
      ]);

      const [summaryJson, chartsJson, alertsJson, urgentJson, strategiesJson] = await Promise.all([
        summaryRes.json(),
        chartsRes.json(),
        alertsRes.json(),
        urgentRes.json(),
        strategiesRes.json(),
      ]);

      setSummary(summaryJson);
      setCharts(chartsJson);
      setAlerts(alertsJson.data ?? []);
      setUrgent(urgentJson.data ?? []);
      setStrategies(strategiesJson.data ?? []);
    }

    load();
  }, []);

  if (!summary || !charts) {
    return <div className="text-sm text-slate-500">Cargando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Dashboard general</p>
          <h1 className="text-3xl font-semibold text-slate-950">Operacion comercial y abastecimiento</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Vista central para inventario, ventas, alertas, sobrestock, productos agotados y recomendaciones automáticas.
          </p>
        </div>
      </section>

      <KPIGrid
        items={[
          { title: "Productos activos", value: summary.totalActiveProducts },
          { title: "Variantes", value: summary.totalVariants },
          { title: "Valor inventario", value: formatCurrency(summary.estimatedInventoryValue) },
          { title: "Ventas 30 dias", value: formatCurrency(summary.salesLast30Days) },
          { title: "Unidades 30 dias", value: summary.unitsSoldLast30Days },
          { title: "Agotados", value: summary.stockouts },
          { title: "Baja rotacion", value: summary.lowRotation },
          { title: "Alertas abiertas", value: summary.openAlerts },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <ExecutiveSummaryCard items={summary.executiveSummary} />
        <AlertList items={alerts.map((item) => ({ id: item.id, alert: item.alert, product: item.product, priority: item.priority, suggestedAction: item.suggestedAction }))} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Ventas por dia ultimos 30 dias">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesByDay30}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#0f766e" fill="#99f6e4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Inventario por coleccion">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.inventoryByCollection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Productos por segmento">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.productsBySegment} dataKey="value" nameKey="segment" outerRadius={90}>
                  {charts.productsBySegment.map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Recompras sugeridas por proveedor">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.reorderByVendor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vendor" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reorder" fill="#b91c1c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Productos mas urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgent.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product}</p>
                      <p className="text-sm text-slate-500">{item.sku} · {item.collection} · {item.vendor}</p>
                    </div>
                    <PriorityBadge value={item.priority} />
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                    <span>Stock: {item.stockCurrent}</span>
                    <span>Objetivo: {item.targetStock}</span>
                    <span>Sugerido: {item.roundedQty}</span>
                    <span>Riesgo: {item.stockoutRisk}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {strategies.map((item) => (
            <StrategyRecommendationCard key={item.id} title={item.scope} action={item.action} priority={item.priority} />
          ))}
        </div>
      </section>
    </div>
  );
}
