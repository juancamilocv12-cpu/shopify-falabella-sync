import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-4xl font-semibold text-slate-950">404</h1>
      <p className="max-w-md text-sm text-slate-600">La vista solicitada no existe o no esta disponible en este entorno.</p>
      <Link href="/dashboard" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Ir al dashboard</Link>
    </div>
  );
}
