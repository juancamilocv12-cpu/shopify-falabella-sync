// @ts-nocheck
"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { InventoryStatusBadge, ResourcePage, SegmentBadge } from "@/components/dashboard";

interface ProductRow {
  id: string;
  image: string;
  product: string;
  status: string;
  vendor: string;
  productType: string;
  tags: string;
  collections: string;
  variants: number;
  stockTotal: number;
  sales30: number;
  sales90: number;
  segment: string;
  inventoryStatus: string;
  suggestedAction: string;
}

const columns: ColumnDef<ProductRow>[] = [
  {
    header: "Producto",
    cell: ({ row }) => <Link className="font-semibold text-emerald-700" href={`/products/${row.original.id}`}>{row.original.product}</Link>,
  },
  { header: "Estado", accessorKey: "status" },
  { header: "Vendor", accessorKey: "vendor" },
  { header: "Tipo", accessorKey: "productType" },
  { header: "Tags", accessorKey: "tags" },
  { header: "Colecciones", accessorKey: "collections" },
  { header: "Variantes", accessorKey: "variants" },
  { header: "Stock total", accessorKey: "stockTotal" },
  { header: "Ventas 30d", accessorKey: "sales30" },
  { header: "Ventas 90d", accessorKey: "sales90" },
  { header: "Segmento", cell: ({ row }) => <SegmentBadge value={row.original.segment} /> },
  { header: "Estado inventario", cell: ({ row }) => <InventoryStatusBadge value={row.original.inventoryStatus} /> },
  { header: "Accion sugerida", accessorKey: "suggestedAction" },
];

export default function ProductsPage() {
  return (
    <ResourcePage
      title="Productos"
      description="Catalogo operativo con ventas, estado de inventario, segmento y acciones sugeridas."
      endpoint="/api/products"
      columns={columns}
      emptyMessage="No hay productos para mostrar."
    />
  );
}
