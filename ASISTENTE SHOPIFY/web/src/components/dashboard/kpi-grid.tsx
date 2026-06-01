import { KPICard } from "@/components/dashboard/kpi-card";

export function KPIGrid({ items }: { items: Array<{ title: string; value: string | number; subtitle?: string }> }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KPICard key={item.title} {...item} />
      ))}
    </section>
  );
}
