"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
};

/**
 * Controlled text input with internal typing state.
 * Notifies parent via onChange only after `debounceMs` of inactivity.
 * The clear (X) button propagates immediately so users see feedback.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  debounceMs = 250,
  className = "w-72",
}: Props) {
  const [local, setLocal] = useState(value);
  const debounced = useDebouncedValue(local, debounceMs);

  // Sync external value → local (e.g., when parent clears via "Limpiar filtros").
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Propagate debounced changes upward.
  useEffect(() => {
    if (debounced !== value) {
      onChange(debounced);
    }
    // We intentionally exclude `value` and `onChange` to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <Input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 h-9"
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}