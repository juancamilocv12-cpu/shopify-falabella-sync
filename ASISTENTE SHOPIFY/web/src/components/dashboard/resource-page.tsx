// @ts-nocheck
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/dashboard/data-table";
import { CollectionFilter, DateRangeFilter, ProductSearch, VendorFilter } from "@/components/dashboard/filters";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/dashboard/states";
import { ExportButton } from "@/components/dashboard/actions";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

type ResourceResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function ResourcePage<T extends Record<string, unknown>>({
  title,
  description,
  endpoint,
  columns,
  emptyMessage,
  enableDateFilters = false,
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: ColumnDef<T>[];
  emptyMessage: string;
  enableDateFilters?: boolean;
}) {
  const [rows, setRows] = React.useState<T[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [q, setQ] = React.useState("");
  const [collection, setCollection] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [collectionOptions, setCollectionOptions] = React.useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), q });
    if (collection) params.set("collection", collection);
    if (vendor) params.set("vendor", vendor);
    if (enableDateFilters && fromDate) params.set("fromDate", fromDate);
    if (enableDateFilters && toDate) params.set("toDate", toDate);

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const payload = (await response.json()) as ResourceResult<T>;
      setRows(payload.data ?? []);
      setTotal(payload.total ?? 0);
    } catch (err) {
      setError(`No fue posible cargar la informacion: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [collection, enableDateFilters, endpoint, fromDate, page, pageSize, q, toDate, vendor]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [collectionsRes, vendorsRes] = await Promise.all([
          fetch("/api/collections?page=1&pageSize=250", { cache: "no-store" }),
          fetch("/api/vendors?page=1&pageSize=250", { cache: "no-store" }),
        ]);
        const [collectionsJson, vendorsJson] = await Promise.all([collectionsRes.json(), vendorsRes.json()]);

        const nextCollections = (collectionsJson?.data ?? [])
          .map((item: Record<string, unknown>) => String(item.name ?? ""))
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b));

        const nextVendors = (vendorsJson?.data ?? [])
          .map((item: Record<string, unknown>) => String(item.vendor ?? ""))
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b));

        setCollectionOptions(nextCollections);
        setVendorOptions(nextVendors);
      } catch {
        setCollectionOptions([]);
        setVendorOptions([]);
      }
    }

    loadFilterOptions();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
            <div className="flex gap-2">
              <ExportButton href={`/api/exports/${endpoint.replace("/api/", "")}`} />
              <Button variant="secondary" onClick={load}>Actualizar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid gap-2 lg:grid-cols-5">
            <ProductSearch value={q} onChange={setQ} />
            <CollectionFilter value={collection} onChange={setCollection} options={collectionOptions} />
            <VendorFilter value={vendor} onChange={setVendor} options={vendorOptions} />
            {enableDateFilters ? (
              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
              />
            ) : null}
            <Button onClick={() => { setPage(1); load(); }}>Aplicar filtros</Button>
          </div>

          {loading ? <LoadingSkeleton /> : null}
          {error ? <ErrorState message={error} /> : null}

          {!loading && !error && rows.length === 0 ? <EmptyState message={emptyMessage} /> : null}

          {!loading && !error && rows.length > 0 ? (
            <DataTable columns={columns} data={rows} total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
