"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { checked, onCheckedChange, disabled, className, "aria-label": ariaLabel },
    ref
  ) {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={cn(
          "h-4 w-4 rounded border-gray-300 text-[var(--theme-primary)]",
          "focus:ring-2 focus:ring-[var(--theme-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer",
          className
        )}
      />
    );
  }
);
