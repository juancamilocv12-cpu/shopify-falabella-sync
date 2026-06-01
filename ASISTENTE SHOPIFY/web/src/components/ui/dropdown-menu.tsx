"use client";

import * as React from "react";

export function DropdownMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block text-left">
      <button type="button" onClick={() => setOpen((x) => !x)}>{trigger}</button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-md">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
