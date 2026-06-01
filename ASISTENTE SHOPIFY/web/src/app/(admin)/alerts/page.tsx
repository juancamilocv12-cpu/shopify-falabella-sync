// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PriorityBadge, ResourcePage } from "@/components/dashboard";
import type { AlertItem } from "@/types/dashboard";

const columns: ColumnDef<AlertItem>[] = [
  { header: "Alerta", accessorKey: "alert" },
  { header: "Producto", accessorKey: "product" },
  { header: "SKU", accessorKey: "sku" },
  { header: "Tipo", accessorKey: "type" },
  { header: "Prioridad", cell: ({ row }) => <PriorityBadge value={row.original.priority} /> },
  { header: "Fecha", accessorKey: "createdAt" },
  { header: "Estado", accessorKey: "status" },
  { header: "Motivo", accessorKey: "reason" },
  { header: "Accion sugerida", accessorKey: "suggestedAction" },
];

export default function AlertsPage() {
  return (
    <ResourcePage
      title="Alertas"
      description="Centro de alertas de inventario, recompra, marketing, stockout y sobrestock."
      endpoint="/api/alerts"
      columns={columns}
      emptyMessage="No hay alertas con los filtros seleccionados."
    />
  );
}
