import { notFound } from "next/navigation";
import { ProductDetailPanel, TrendBadge, InventoryStatusBadge, PriorityBadge } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getProductById } from "@/lib/dashboard-service";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">{product.product}</h1>
        <p className="text-sm text-slate-600">{product.sku} · {product.collection} · {product.vendor}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ProductDetailPanel title="Informacion general" rows={[
          { label: "Variante", value: product.variant },
          { label: "Ubicacion", value: product.location },
          { label: "Stock actual", value: product.currentStock },
          { label: "Stock disponible", value: product.availableStock },
        ]} />
        <ProductDetailPanel title="Planeacion de demanda" rows={[
          { label: "Minimo requerido", value: product.demand?.minimumRequiredStock ?? 0 },
          { label: "Punto de recompra", value: product.demand?.reorderPoint ?? 0 },
          { label: "Inventario objetivo", value: product.demand?.targetStock ?? 0 },
          { label: "Sugerido", value: product.demand?.roundedQty ?? 0 },
        ]} />
        <ProductDetailPanel title="Ventas historicas" rows={[
          { label: "Ventas 30d", value: product.sales?.sales30 ?? 0 },
          { label: "Ventas 90d", value: product.sales?.sales90 ?? 0 },
          { label: "Ventas 180d", value: product.sales?.sales180 ?? 0 },
          { label: "Tendencia", value: product.sales?.trend ?? "stable" },
        ]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventario por ubicacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {product.inventoryByLocation.map((row: { location: string; stock: number; reserved: number }) => (
                <div key={row.location} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                  <span>{row.location}</span>
                  <span>Stock {row.stock} / Reservado {row.reserved}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertas y recomendaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><InventoryStatusBadge value={product.inventoryStatus} /><TrendBadge value={product.sales?.trend ?? "stable"} /></div>
              {product.recommendations.map((rec: { id: string; recommendation: string; priority: string; reason: string }) => (
                <div key={rec.id} className="rounded border border-slate-200 p-2">
                  <div className="flex items-center justify-between"><span>{rec.recommendation}</span><PriorityBadge value={rec.priority} /></div>
                  <p className="mt-1 text-slate-600">{rec.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
