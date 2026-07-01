"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterOption = { value: string; label: string };

type Props = {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: FilterOption[];
  placeholder: string;
  clearable?: boolean;
  className?: string;
};

export function ColumnFilterSelect({
  value,
  onChange,
  options,
  placeholder,
  clearable = true,
  className = "w-44",
}: Props) {
  // shadcn Select uses "" for "no value". Map to undefined externally.
  const handleChange = (v: string | null) => {
    if (v === null || v === "__clear__") {
      onChange(undefined);
      return;
    }
    onChange(v);
  };

  return (
    <Select value={value ?? ""} onValueChange={handleChange}>
      <SelectTrigger className={`h-9 ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clearable && (
          <SelectItem value="__clear__">
            <span className="text-gray-500">— {placeholder} —</span>
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
