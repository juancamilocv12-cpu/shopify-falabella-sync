import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/inventory",
  "/sales",
  "/low-rotation",
  "/overstock",
  "/stockouts",
  "/demand-planning",
  "/demand-analytics",
  "/reorder-list",
  "/marketing-strategies",
  "/collections",
  "/products",
  "/vendors",
  "/alerts",
  "/exports",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("shopify_admin_session")?.value;
  if (session === "valid") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
