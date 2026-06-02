// @ts-nocheck
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui";
import {
  PriorityBadge,
  RecommendationDrawer,
  ResourcePage,
  RiskBadge,
  TrendBadge,
} from "@/components/dashboard";
import type { DemandPlanningItem } from "@/types/dashboard";

function ActionsCell({ item, onExplain }: { item: DemandPlanningItem; onExplain: (item: DemandPlanningItem) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => onExplain(item)}>Ver calculo</Button>
      <Button variant="secondary">Aceptar</Button>
    </div>
  );
}

export default function DemandPlanningPage() {
  const [selected, setSelected] = React.useState<DemandPlanningItem | null>(null);

  const columns = React.useMemo<ColumnDef<DemandPlanningItem>[]>(() => [
    { header: "Producto", accessorKey: "product" },
    { header: "Variante", accessorKey: "variant" },
    { header: "SKU", accessorKey: "sku" },
    { header: "Vendor", accessorKey: "vendor" },
    { header: "Coleccion", accessorKey: "collection" },
    { header: "Stock", accessorKey: "stockCurrent" },
    { header: "Ventas 30d", accessorKey: "sales30" },
    { header: "Ventas 90d", accessorKey: "sales90" },
    { header: "Demanda mensual", accessorKey: "monthlyDemand" },
    { header: "Cobertura meses", accessorKey: "monthsCoverage" },
    { header: "Minimo", accessorKey: "minimumRequiredStock" },
    { header: "P. recompra", accessorKey: "reorderPoint" },
    { header: "Objetivo", accessorKey: "targetStock" },
    { header: "Sugerido", accessorKey: "suggestedQty" },
    { header: "Redondeado", accessorKey: "roundedQty" },
    { header: "Riesgo", cell: ({ row }) => <RiskBadge value={row.original.stockoutRisk} /> },
    { header: "Tendencia", cell: ({ row }) => <TrendBadge value={row.original.trend} /> },
    {
      header: "Fecha recomendacion",
      cell: ({ row }) => new Date(row.original.recommendedAt).toLocaleDateString("es-CO"),
    },
    { header: "Recomendacion", accessorKey: "recommendation" },
    { header: "Prioridad", cell: ({ row }) => <PriorityBadge value={row.original.priority} /> },
    { header: "Acciones", cell: ({ row }) => <ActionsCell item={row.original} onExplain={setSelected} /> },
  ], []);

  return (
    <>
      <ResourcePage
        title="Planeacion de demanda"
        description="Motor de demanda, cobertura, stock minimo, punto de recompra y cantidad sugerida por SKU."
        endpoint="/api/demand-planning"
        columns={columns}
        emptyMessage="No hay recomendaciones de planeacion de demanda disponibles."
        enableDateFilters
      />
      <RecommendationDrawer
        open={Boolean(selected)}
        onOpen={(value) => !value && setSelected(null)}
        title={selected ? `${selected.product} · ${selected.sku}` : ""}
        reason={selected?.reason ?? ""}
      />
    </>
  );
}
