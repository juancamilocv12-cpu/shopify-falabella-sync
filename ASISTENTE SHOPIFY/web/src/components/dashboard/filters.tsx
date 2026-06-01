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
