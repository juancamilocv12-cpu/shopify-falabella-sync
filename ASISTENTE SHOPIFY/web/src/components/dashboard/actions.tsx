"use client";

import { Button, DropdownMenu, DropdownMenuItem } from "@/components/ui";

export function ExportButton({ href }: { href: string }) {
  return (
    <DropdownMenu trigger={<span className="inline-flex rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white">Exportar</span>}>
      <DropdownMenuItem>
        <a href={`${href}&format=csv`} className="block w-full">CSV</a>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <a href={`${href}&format=xlsx`} className="block w-full">Excel</a>
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export function QuickActions({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary?: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onPrimary}>Accion principal</Button>
      {onSecondary ? <Button variant="outline" onClick={onSecondary}>Accion secundaria</Button> : null}
    </div>
  );
}
