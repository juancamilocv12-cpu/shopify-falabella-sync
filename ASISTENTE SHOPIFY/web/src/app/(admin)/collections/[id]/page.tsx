import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { KPIGrid } from "@/components/dashboard";
import { getCollectionById } from "@/lib/dashboard-service";
import { formatCurrency } from "@/lib/utils";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getCollectionById(id);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">Coleccion {detail.name}</h1>
        <p className="text-sm text-slate-600">KPIs, productos, alertas, estrategias y recompra sugerida por coleccion.</p>
      </div>
      <KPIGrid
        items={[
          { title: "Productos", value: detail.products.length },
          { title: "Stock total", value: detail.stockTotal },
          { title: "Ventas 30d", value: detail.sales30 },
          { title: "Valor inventario", value: formatCurrency(detail.inventoryValue) },
        ]}
      />
      <Card>
        <CardHeader><CardTitle>Productos de la coleccion</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {detail.products.slice(0, 12).map((product: { id: string; product: string; availableStock: number; monthsOfInventory: number }) => (
              <div key={product.id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">{product.product}</p>
                <p className="text-slate-600">Stock {product.availableStock}</p>
                <p className="text-slate-500">Cobertura {product.monthsOfInventory} meses</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
