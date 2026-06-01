// @ts-nocheck
"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ResourcePage } from "@/components/dashboard";
import type { VendorItem } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";

const columns: ColumnDef<VendorItem>[] = [
  {
    header: "Vendor",
    cell: ({ row }) => <Link className="font-semibold text-emerald-700" href={`/vendors/${encodeURIComponent(row.original.vendor)}`}>{row.original.vendor}</Link>,
  },
  { header: "Productos activos", accessorKey: "activeProducts" },
  { header: "Stock total", accessorKey: "stockTotal" },
  { header: "Ventas 30d", accessorKey: "sales30" },
  { header: "Ventas 90d", accessorKey: "sales90" },
  { header: "Valor inventario", cell: ({ row }) => formatCurrency(row.original.inventoryValue) },
  { header: "Baja rotacion", accessorKey: "lowRotationProducts" },
  { header: "Recompras", accessorKey: "reorderProducts" },
  { header: "Sobrestock", accessorKey: "overstockProducts" },
  { header: "Recomendacion", accessorKey: "recommendation" },
];

export default function VendorsPage() {
  return (
    <ResourcePage
      title="Proveedores / marcas"
      description="Consolidado por vendor con ventas, stock, productos para recompra y exceso de inventario."
      endpoint="/api/vendors"
      columns={columns}
      emptyMessage="No hay vendors disponibles."
    />
  );
}
