import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { KPIGrid, PriorityBadge } from "@/components/dashboard";
import { getVendorDetail } from "@/lib/dashboard-service";
import { formatCurrency } from "@/lib/utils";

export default async function VendorDetailPage({ params }: { params: Promise<{ vendor: string }> }) {
  const { vendor } = await params;
  const detail = getVendorDetail(decodeURIComponent(vendor));
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">Vendor {detail.vendor}</h1>
        <p className="text-sm text-slate-600">Resumen comercial, inventario, recompra sugerida y estrategias por proveedor.</p>
      </div>
      <KPIGrid
        items={[
          { title: "Productos activos", value: detail.activeProducts },
          { title: "Stock total", value: detail.stockTotal },
          { title: "Ventas 30d", value: detail.sales30 },
          { title: "Valor inventario", value: formatCurrency(detail.inventoryValue) },
        ]}
      />
      <Card>
        <CardHeader><CardTitle>Recompras sugeridas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {detail.reorder.slice(0, 10).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{row.product}</p>
                  <p className="text-slate-500">{row.sku} · Cantidad {row.roundedQty}</p>
                </div>
                <PriorityBadge value={row.priority} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
