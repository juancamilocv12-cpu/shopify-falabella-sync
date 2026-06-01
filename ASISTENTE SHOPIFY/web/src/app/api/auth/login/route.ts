import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email ?? "";
  const password = body.password ?? "";

  const expectedEmail = process.env.ADMIN_EMAIL ?? "admin@shopify.local";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("shopify_admin_session", "valid", {
    httpOnly: true,
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ success: true });
}
