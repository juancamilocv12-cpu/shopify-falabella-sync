"use client";

import { Sheet, Button } from "@/components/ui";

export function RecommendationDrawer({
  open,
  onOpen,
  title,
  reason,
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  title: string;
  reason: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpen}>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm text-slate-700">{reason}</p>
      <div className="mt-4">
        <Button onClick={() => onOpen(false)}>Cerrar</Button>
      </div>
    </Sheet>
  );
}
