"use client";

import { Input } from "@/components/ui/input";

export function DateRangePicker({
  from,
  to,
  onFrom,
  onTo,
}: {
  from?: string;
  to?: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={from ?? ""} onChange={(e) => onFrom(e.target.value)} />
      <span className="text-slate-500">a</span>
      <Input type="date" value={to ?? ""} onChange={(e) => onTo(e.target.value)} />
    </div>
  );
}
