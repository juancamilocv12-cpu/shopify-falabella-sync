import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function ExecutiveSummaryCard({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen ejecutivo</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="rounded bg-slate-50 p-2">{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function StrategyRecommendationCard({ title, action, priority }: { title: string; action: string; priority: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{action}</p>
        <p className="mt-2 text-xs font-semibold uppercase text-violet-700">Prioridad: {priority}</p>
      </CardContent>
    </Card>
  );
}

export function DemandPlanningCard({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-700">{detail}</p>
      </CardContent>
    </Card>
  );
}
