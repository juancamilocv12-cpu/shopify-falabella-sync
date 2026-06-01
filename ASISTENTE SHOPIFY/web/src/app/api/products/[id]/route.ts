import { NextResponse } from "next/server";
import { getProductById } from "@/lib/dashboard-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getProductById(id);
  if (!found) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(found);
}
