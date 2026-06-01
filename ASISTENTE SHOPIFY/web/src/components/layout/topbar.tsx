"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="relative w-full max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por producto, SKU, coleccion, proveedor o tag"
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
          <Bell className="h-4 w-4" />
        </button>
        <div className="rounded-full bg-emerald-700 px-3 py-1 text-sm font-semibold text-white">Admin</div>
      </div>
    </header>
  );
}
