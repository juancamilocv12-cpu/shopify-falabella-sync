"use client";

import { Input, Select } from "@/components/ui";

export function ProductSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input placeholder="Buscar producto o SKU" value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function CollectionFilter({
  value,
  onChange,
  options = [],
}: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={[
        { value: "", label: "Todas las colecciones" },
        ...options.map((option) => ({ value: option, label: option })),
      ]}
    />
  );
}

export function VendorFilter({
  value,
  onChange,
  options = [],
}: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={[
        { value: "", label: "Todos los vendors" },
        ...options.map((option) => ({ value: option, label: option })),
      ]}
    />
  );
}

export function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: {
  fromDate: string;
  toDate: string;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        type="date"
        value={fromDate}
        onChange={(e) => onFromDateChange(e.target.value)}
        aria-label="Fecha inicial"
      />
      <Input
        type="date"
        value={toDate}
        onChange={(e) => onToDateChange(e.target.value)}
        aria-label="Fecha final"
      />
    </div>
  );
}
