import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/dashboard-service";
import { parseQuery } from "@/app/api/_utils";

export async function GET(request: NextRequest) {
  return NextResponse.json(getCollections(parseQuery(request)));
}
