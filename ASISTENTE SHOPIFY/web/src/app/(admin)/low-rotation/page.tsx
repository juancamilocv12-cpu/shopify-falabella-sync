// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage } from "@/components/dashboard";
import type { InventoryItem } from "@/types/dashboard";

const columns: ColumnDef<InventoryItem>[] = [
  { header: "Producto", accessorKey: "product" },
  { header: "Variante", accessorKey: "variant" },
  { header: "SKU", accessorKey: "sku" },
  { header: "Stock", accessorKey: "availableStock" },
  { header: "Dias inventario", accessorKey: "daysOfInventory" },
  { header: "Meses inventario", accessorKey: "monthsOfInventory" },
  { header: "Coleccion", accessorKey: "collection" },
  { header: "Vendor", accessorKey: "vendor" },
];

export default function LowRotationPage() {
  return (
    <ResourcePage
      title="Baja rotacion"
      description="Productos con rotacion lenta, sin salida suficiente y candidatos a acciones comerciales."
      endpoint="/api/low-rotation"
      columns={columns}
      emptyMessage="No hay productos de baja rotacion con los filtros actuales."
    />
  );
}
