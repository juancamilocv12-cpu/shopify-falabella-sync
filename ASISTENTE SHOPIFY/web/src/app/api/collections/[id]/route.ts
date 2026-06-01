import { NextResponse } from "next/server";
import { getCollectionById } from "@/lib/dashboard-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getCollectionById(id);
  if (!found) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  return NextResponse.json(found);
}
