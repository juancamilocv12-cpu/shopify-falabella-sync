import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PriorityBadge } from "@/components/dashboard/badges";

type AlertRow = { id: string; alert: string; product: string; priority: string; suggestedAction: string };

export function AlertList({ items }: { items: AlertRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas criticas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded border border-slate-200 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.alert}</p>
                <PriorityBadge value={item.priority} />
              </div>
              <p className="text-xs text-slate-600">{item.product}</p>
              <p className="text-xs text-slate-500">{item.suggestedAction}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
