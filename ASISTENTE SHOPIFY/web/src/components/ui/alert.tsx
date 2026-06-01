import { cn } from "@/lib/utils";

export function Alert({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "destructive" }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-700",
      )}
    >
      {children}
    </div>
  );
}
