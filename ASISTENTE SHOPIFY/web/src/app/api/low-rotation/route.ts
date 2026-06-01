import { NextRequest, NextResponse } from "next/server";
import { getLowRotation } from "@/lib/dashboard-service";
import { parseQuery } from "@/app/api/_utils";

export async function GET(request: NextRequest) {
  return NextResponse.json(getLowRotation(parseQuery(request)));
}
