// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { InventoryStatusBadge, ResourcePage } from "@/components/dashboard";
import type { InventoryItem } from "@/types/dashboard";

const columns: ColumnDef<InventoryItem>[] = [
  { header: "Producto", accessorKey: "product" },
  { header: "SKU", accessorKey: "sku" },
  { header: "Coleccion", accessorKey: "collection" },
  { header: "Vendor", accessorKey: "vendor" },
  { header: "Disponible", accessorKey: "availableStock" },
  { header: "Meses inventario", accessorKey: "monthsOfInventory" },
  { header: "Dias inventario", accessorKey: "daysOfInventory" },
  {
    header: "Estado",
    cell: ({ row }) => <InventoryStatusBadge value={row.original.inventoryStatus} />,
  },
];

export default function OverstockPage() {
  return (
    <ResourcePage
      title="Sobrestock"
      description="Productos con exceso de inventario, capital detenido y candidatos a liquidacion o bundles."
      endpoint="/api/overstock"
      columns={columns}
      emptyMessage="No hay productos con sobrestock para mostrar."
    />
  );
}
