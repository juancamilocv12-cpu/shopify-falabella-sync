// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage } from "@/components/dashboard";
import type { InventoryItem } from "@/types/dashboard";

const columns: ColumnDef<InventoryItem>[] = [
  { header: "Producto", accessorKey: "product" },
  { header: "SKU", accessorKey: "sku" },
  { header: "Coleccion", accessorKey: "collection" },
  { header: "Vendor", accessorKey: "vendor" },
  { header: "Stock actual", accessorKey: "currentStock" },
  { header: "Entrante", accessorKey: "incomingStock" },
  { header: "Punto recompra", accessorKey: "reorderPoint" },
  { header: "Minimo", accessorKey: "minimumRequiredStock" },
];

export default function StockoutsPage() {
  return (
    <ResourcePage
      title="Agotados"
      description="Productos agotados con demanda historica, posibles ventas perdidas y recompra recomendada."
      endpoint="/api/stockouts"
      columns={columns}
      emptyMessage="No hay agotados en este momento."
    />
  );
}
