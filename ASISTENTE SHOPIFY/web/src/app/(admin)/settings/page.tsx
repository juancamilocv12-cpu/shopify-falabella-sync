"use client";

import * as React from "react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";

function SettingsSection({ title, fields }: { title: string; fields: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field} className="space-y-1 text-sm text-slate-700">
              <span>{field}</span>
              <Input defaultValue="" placeholder={field} />
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [syncState, setSyncState] = React.useState<{
    configured: boolean;
    source?: string;
    lastSyncedAt?: string | null;
  } | null>(null);
  const [message, setMessage] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    const response = await fetch("/api/shopify/status", { cache: "no-store" });
    const payload = (await response.json()) as {
      configured: boolean;
      source?: string;
      lastSyncedAt?: string | null;
    };
    setSyncState(payload);
  }, []);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function runSync() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/shopify/sync", { method: "POST" });
      const payload = (await response.json()) as { error?: string; products?: number; syncedAt?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "No fue posible sincronizar Shopify");
      } else {
        setMessage(`Sincronizacion completada. Productos procesados: ${payload.products ?? 0}`);
      }
      await loadStatus();
    } catch (error) {
      setMessage(`Error de red al sincronizar: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">Configuracion</h1>
          <p className="text-sm text-slate-600">Parametros base para Shopify, inventario, demand planning, mercadeo y alertas.</p>
        </div>
        <Button>Guardar cambios</Button>
      </div>
      {message ? <Alert>{message}</Alert> : null}
      <SettingsSection title="Shopify" fields={["Estado de conexion", "Ultima sincronizacion", "Sincronizar productos", "Sincronizar ordenes", "Full sync"]} />
      <Card>
        <CardHeader>
          <CardTitle>Conexion Shopify</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Estado: <strong>{syncState?.configured ? "Conectado" : "No configurado"}</strong>
          </p>
          <p>
            Fuente de datos actual: <strong>{syncState?.source ?? "mock"}</strong>
          </p>
          <p>
            Ultima sincronizacion: <strong>{syncState?.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleString("es-CO") : "No disponible"}</strong>
          </p>
          <p className="text-slate-600">
            Configura <code>SHOPIFY_STORE_DOMAIN</code> y <code>SHOPIFY_ACCESS_TOKEN</code> en <code>web/.env.local</code> para sincronizar datos reales.
          </p>
          <div className="flex gap-2">
            <Button onClick={runSync} disabled={loading}>
              {loading ? "Sincronizando..." : "Sincronizar ahora"}
            </Button>
            <Button variant="outline" onClick={loadStatus}>Actualizar estado</Button>
          </div>
        </CardContent>
      </Card>
      <SettingsSection title="Inventario" fields={["Inventario minimo base", "Lead time por defecto", "Safety stock", "Meses de cobertura objetivo", "Umbral de baja rotacion", "Umbral de sobrestock"]} />
      <SettingsSection title="Planeacion de demanda" fields={["targetCoverageMonths", "demandLookbackDays", "minimumStockBase", "safetyStockPercentage", "reorderPointBufferDays", "minSalesHistoryDays"]} />
      <SettingsSection title="Mercadeo" fields={["Descuento maximo sugerido", "Margen minimo para descuento", "Canales preferidos", "Duracion por defecto", "Tags excluidos", "Vendors excluidos"]} />
      <SettingsSection title="Alertas" fields={["Configuracion email", "Slack webhook", "Frecuencia", "Prioridades"]} />
    </div>
  );
}
