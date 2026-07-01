"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "./SearchInput";
import { ColumnFilterSelect, FilterOption } from "./ColumnFilterSelect";

export type ColumnFilterDef = {
  key: string;
  label: string;
  options: FilterOption[];
};

type Props = {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  filters: ColumnFilterDef[];
  filterValues: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
};

export function TableToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
}: Props) {
  const activeCount = Object.values(filterValues).filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />

      {filters.map((f) => (
        <ColumnFilterSelect
          key={f.key}
          value={filterValues[f.key]}
          onChange={(v) => onFilterChange(f.key, v)}
          options={f.options}
          placeholder={f.label}
        />
      ))}

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            for (const f of filters) {
              if (filterValues[f.key]) onFilterChange(f.key, undefined);
            }
            onSearchChange("");
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircle className="w-4 h-4 mr-1" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
