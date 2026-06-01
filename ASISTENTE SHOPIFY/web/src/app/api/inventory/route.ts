import { NextRequest, NextResponse } from "next/server";
import { getInventory } from "@/lib/dashboard-service";
import { parseQuery } from "@/app/api/_utils";

export async function GET(request: NextRequest) {
  return NextResponse.json(getInventory(parseQuery(request)));
}
