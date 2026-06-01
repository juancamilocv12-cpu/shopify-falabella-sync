import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function InventoryStatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    healthy: "bg-emerald-100 text-emerald-700",
    attention: "bg-amber-100 text-amber-700",
    risk: "bg-red-100 text-red-700",
    stockout: "bg-red-200 text-red-800",
    overstock: "bg-orange-100 text-orange-700",
  };
  return <Badge className={cn(styles[value] ?? "bg-slate-100 text-slate-700")}>{value}</Badge>;
}

export function PriorityBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-700 text-white",
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-emerald-100 text-emerald-700",
    none: "bg-slate-100 text-slate-700",
  };
  return <Badge className={cn(styles[value] ?? "bg-slate-100 text-slate-700")}>{value}</Badge>;
}

export function RiskBadge({ value }: { value: string }) {
  return <PriorityBadge value={value === "high" ? "high" : value === "medium" ? "medium" : "low"} />;
}

export function TrendBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    growing: "bg-blue-100 text-blue-700",
    stable: "bg-emerald-100 text-emerald-700",
    declining: "bg-orange-100 text-orange-700",
    no_data: "bg-slate-100 text-slate-700",
  };
  return <Badge className={cn(styles[value] ?? "bg-slate-100 text-slate-700")}>{value}</Badge>;
}

export function SegmentBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    core: "bg-emerald-100 text-emerald-700",
    seasonal: "bg-sky-100 text-sky-700",
    strategic: "bg-violet-100 text-violet-700",
    experimental: "bg-slate-100 text-slate-700",
  };
  return <Badge className={cn(styles[value] ?? "bg-slate-100 text-slate-700")}>{value}</Badge>;
}
