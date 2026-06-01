import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function KPICard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}
