// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage, InventoryStatusBadge } from "@/components/dashboard";
import type { InventoryItem } from "@/types/dashboard";

const columns: ColumnDef<InventoryItem>[] = [
  { header: "Producto", accessorKey: "product" },
  { header: "Variante", accessorKey: "variant" },
  { header: "SKU", accessorKey: "sku" },
  { header: "Coleccion", accessorKey: "collection" },
  { header: "Vendor", accessorKey: "vendor" },
  { header: "Disponible", accessorKey: "availableStock" },
  { header: "Entrante", accessorKey: "incomingStock" },
  { header: "Minimo", accessorKey: "minimumRequiredStock" },
  { header: "Punto recompra", accessorKey: "reorderPoint" },
  { header: "Dias inventario", accessorKey: "daysOfInventory" },
  {
    header: "Estado",
    cell: ({ row }) => <InventoryStatusBadge value={row.original.inventoryStatus} />,
  },
];

export default function InventoryPage() {
  return (
    <ResourcePage
      title="Inventario"
      description="Vista operativa de inventario actual, cobertura, puntos de recompra y stock por ubicacion."
      endpoint="/api/inventory"
      columns={columns}
      emptyMessage="No hay productos de inventario para mostrar."
    />
  );
}
