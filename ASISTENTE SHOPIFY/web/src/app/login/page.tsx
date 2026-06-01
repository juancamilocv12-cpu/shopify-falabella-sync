"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@shopify.local");
  const [password, setPassword] = React.useState("admin123");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setError("No fue posible iniciar sesion");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#d1fae5_0%,#f8fafc_50%,#e2e8f0_100%)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acceso administrativo</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1 text-sm">
              <span>Email</span>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Password</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit">Ingresar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
