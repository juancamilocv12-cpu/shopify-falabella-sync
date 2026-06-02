// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage, InventoryStatusBadge } from "@/components/dashboard";
import { Badge } from "@/components/ui";
import type { InventoryItem } from "@/types/dashboard";

function compactCollection(raw: string): { primary: string; extra: number } {
  const chunks = raw
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return { primary: "Sin coleccion", extra: 0 };
  }

  return { primary: chunks[0], extra: Math.max(0, chunks.length - 1) };
}

const columns: ColumnDef<InventoryItem>[] = [
  { header: "Producto", accessorKey: "product" },
  { header: "Variante", accessorKey: "variant" },
  { header: "SKU", accessorKey: "sku" },
  {
    header: "Coleccion",
    cell: ({ row }) => {
      const result = compactCollection(row.original.collection);
      return (
        <div className="flex items-center gap-2">
          <span className="truncate">{result.primary}</span>
          {result.extra > 0 ? <Badge className="bg-slate-100 text-slate-700">+{result.extra}</Badge> : null}
        </div>
      );
    },
  },
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
