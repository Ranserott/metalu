"use client";

import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  /** Ids of the data rows currently visible in the table. Header rows excluded. */
  visibleIds: string[];
  selectedIds: Set<string>;
  onToggleAll: (ids: string[]) => void;
};

export function SelectionCheckboxHeader({
  visibleIds,
  selectedIds,
  onToggleAll,
}: Props) {
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  return (
    <Checkbox
      checked={allVisibleSelected}
      // Native checkbox cannot be indeterminate via `checked`; use `disabled`
      // as a stable visual state by leaving `checked` false when partial.
      onCheckedChange={() => onToggleAll(visibleIds)}
      disabled={visibleIds.length === 0}
      aria-label={
        someVisibleSelected
          ? "Algunos documentos seleccionados. Click para seleccionar todos"
          : "Seleccionar todos los documentos visibles"
      }
    />
  );
}
