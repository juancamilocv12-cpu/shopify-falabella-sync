import { NextRequest } from "next/server";
import type { QueryParams } from "@/types/dashboard";

export function parseQuery(request: NextRequest): QueryParams {
  const { searchParams } = new URL(request.url);
  const query: QueryParams = {};

  searchParams.forEach((value, key) => {
    if (key === "page" || key === "pageSize") {
      query[key] = Number(value);
    } else {
      query[key] = value;
    }
  });

  return query;
}
