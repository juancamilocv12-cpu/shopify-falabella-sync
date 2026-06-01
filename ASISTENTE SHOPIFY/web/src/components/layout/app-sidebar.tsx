"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  ["Dashboard general", "/dashboard"],
  ["Inventario", "/inventory"],
  ["Ventas", "/sales"],
  ["Baja rotacion", "/low-rotation"],
  ["Sobrestock", "/overstock"],
  ["Agotados", "/stockouts"],
  ["Planeacion de demanda", "/demand-planning"],
  ["Recompras sugeridas", "/reorder-list"],
  ["Estrategias de mercadeo", "/marketing-strategies"],
  ["Colecciones", "/collections"],
  ["Productos", "/products"],
  ["Proveedores / marcas", "/vendors"],
  ["Alertas", "/alerts"],
  ["Exportaciones", "/exports"],
  ["Configuracion", "/settings"],
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-r border-slate-200 bg-white lg:w-72">
      <div className="border-b border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Shopify Ops</p>
        <h1 className="text-lg font-semibold text-slate-900">Control Center</h1>
      </div>
      <nav className="space-y-1 p-3">
        {items.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition",
              pathname.startsWith(href)
                ? "bg-emerald-100 font-semibold text-emerald-800"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
