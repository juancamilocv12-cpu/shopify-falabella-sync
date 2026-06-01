// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PriorityBadge, ResourcePage } from "@/components/dashboard";
import type { DemandPlanningItem } from "@/types/dashboard";

const columns: ColumnDef<DemandPlanningItem>[] = [
  { header: "SKU", accessorKey: "sku" },
  { header: "Producto", accessorKey: "product" },
  { header: "Variante", accessorKey: "variant" },
  { header: "Vendor", accessorKey: "vendor" },
  { header: "Stock", accessorKey: "stockCurrent" },
  { header: "Demanda mensual", accessorKey: "monthlyDemand" },
  { header: "Lead/Objetivo", accessorKey: "targetStock" },
  { header: "Cantidad sugerida", accessorKey: "suggestedQty" },
  { header: "Cantidad redondeada", accessorKey: "roundedQty" },
  { header: "Motivo", accessorKey: "reason" },
  { header: "Prioridad", cell: ({ row }) => <PriorityBadge value={row.original.priority} /> },
];

export default function ReorderListPage() {
  return (
    <ResourcePage
      title="Recompras sugeridas"
      description="Lista limpia para compras con agrupacion operativa por proveedor, prioridad y riesgo."
      endpoint="/api/reorder-list"
      columns={columns}
      emptyMessage="No hay recompras sugeridas con los filtros actuales."
    />
  );
}
