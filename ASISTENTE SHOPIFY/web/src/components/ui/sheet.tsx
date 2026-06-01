"use client";

import * as React from "react";

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => onOpenChange(false)}>
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </aside>
    </div>
  );
}
