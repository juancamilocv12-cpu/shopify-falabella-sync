// @ts-nocheck
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PriorityBadge, ResourcePage, RiskBadge } from "@/components/dashboard";
import type { StrategyItem } from "@/types/dashboard";

const columns: ColumnDef<StrategyItem>[] = [
  { header: "Producto / scope", accessorKey: "scope" },
  { header: "Tipo", accessorKey: "strategyType" },
  { header: "Diagnostico", accessorKey: "diagnosis" },
  { header: "Accion", accessorKey: "action" },
  { header: "Canal", accessorKey: "channel" },
  { header: "Descuento", accessorKey: "discountPct" },
  { header: "Duracion", accessorKey: "durationDays" },
  { header: "Prioridad", cell: ({ row }) => <PriorityBadge value={row.original.priority} /> },
  { header: "Confianza", accessorKey: "confidence" },
  { header: "Riesgo", cell: ({ row }) => <RiskBadge value={row.original.risk} /> },
  { header: "Estado", accessorKey: "status" },
];

export default function MarketingStrategiesPage() {
  return (
    <ResourcePage
      title="Estrategias de mercadeo"
      description="Recomendaciones accionables del motor de marketing por producto, coleccion o vendor."
      endpoint="/api/marketing-strategies"
      columns={columns}
      emptyMessage="No hay estrategias de mercadeo disponibles."
    />
  );
}
