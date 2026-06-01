import { Alert, Skeleton } from "@/components/ui";

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">{message}</div>;
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <Alert variant="destructive">{message}</Alert>;
}
