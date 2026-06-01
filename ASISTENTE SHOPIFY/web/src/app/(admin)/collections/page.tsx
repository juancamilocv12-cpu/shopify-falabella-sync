// @ts-nocheck
"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage } from "@/components/dashboard";
import type { CollectionItem } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";

const columns: ColumnDef<CollectionItem>[] = [
  {
    header: "Coleccion",
    cell: ({ row }) => <Link className="font-semibold text-emerald-700" href={`/collections/${row.original.id}`}>{row.original.name}</Link>,
  },
  { header: "Productos", accessorKey: "products" },
  { header: "Stock total", accessorKey: "stockTotal" },
  { header: "Ventas 30d", accessorKey: "sales30" },
  { header: "Ventas 90d", accessorKey: "sales90" },
  { header: "Valor inventario", cell: ({ row }) => formatCurrency(row.original.inventoryValue) },
  { header: "Baja rotacion", accessorKey: "lowRotation" },
  { header: "Sobrestock", accessorKey: "overstock" },
  { header: "Riesgo agotado", accessorKey: "stockoutRisk" },
  { header: "Estrategia", accessorKey: "strategy" },
];

export default function CollectionsPage() {
  return (
    <ResourcePage
      title="Colecciones"
      description="Rendimiento operativo por coleccion: ventas, inventario, baja rotacion, sobrestock y riesgo."
      endpoint="/api/collections"
      columns={columns}
      emptyMessage="No hay colecciones disponibles."
    />
  );
}
