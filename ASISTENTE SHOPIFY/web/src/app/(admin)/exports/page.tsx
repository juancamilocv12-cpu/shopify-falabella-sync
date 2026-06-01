import { ExportButton } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const exportItems = [
  ["Inventario completo", "inventory"],
  ["Baja rotacion", "low-rotation"],
  ["Sobrestock", "overstock"],
  ["Recompras sugeridas", "reorder-list"],
  ["Planeacion de demanda", "demand-planning"],
  ["Estrategias de mercadeo", "marketing-strategies"],
  ["Productos agotados", "stockouts"],
  ["Reporte por coleccion", "collections"],
  ["Reporte por proveedor", "vendors"],
  ["Reporte ejecutivo", "executive"],
] as const;

export default function ExportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">Exportaciones</h1>
        <p className="text-sm text-slate-600">Descarga reportes operativos y ejecutivos en CSV o JSON base para Excel.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exportItems.map(([label, type]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ExportButton href={`/api/exports/${type}?scope=all`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
