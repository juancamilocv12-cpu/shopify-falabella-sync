import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function ProductBadge({ text }: { text: string }) {
  return <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{text}</span>;
}

export function ProductDetailPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-semibold text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
