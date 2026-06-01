// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage, TrendBadge } from "@/components/dashboard";
import type { SalesItem } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";

const columns: ColumnDef<SalesItem>[] = [
  { header: "Producto", accessorKey: "product" },
  { header: "SKU", accessorKey: "sku" },
  { header: "Coleccion", accessorKey: "collection" },
  { header: "Vendor", accessorKey: "vendor" },
  { header: "Ventas 7d", accessorKey: "sales7" },
  { header: "Ventas 30d", accessorKey: "sales30" },
  { header: "Ventas 90d", accessorKey: "sales90" },
  {
    header: "Ingresos 30d",
    cell: ({ row }) => formatCurrency(row.original.revenue30),
  },
  {
    header: "Tendencia",
    cell: ({ row }) => <TrendBadge value={row.original.trend} />,
  },
  { header: "Stock", accessorKey: "stock" },
];

export default function SalesPage() {
  return (
    <ResourcePage
      title="Ventas"
      description="Comparativos de ventas por producto, vendor y coleccion en ventanas de 7, 30, 90 y 180 dias."
      endpoint="/api/sales"
      columns={columns}
      emptyMessage="No hay datos de ventas disponibles."
    />
  );
}
