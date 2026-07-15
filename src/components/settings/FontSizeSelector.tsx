"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "metalu.fontScale";
const STEPS = [0.9, 0.95, 1.0, 1.05, 1.1] as const;
type Step = (typeof STEPS)[number];

function isStep(n: unknown): n is Step {
  return typeof n === "number" && STEPS.includes(n as Step);
}

function readStored(): Step {
  if (typeof window === "undefined") return 1.0;
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw == null ? NaN : Number(raw);
  return isStep(n) ? n : 1.0;
}

export function FontSizeSelector() {
  const [scale, setScale] = useState<Step>(1.0);

  // Read on mount in case inline script was disabled by the user
  useEffect(() => {
    setScale(readStored());
  }, []);

  // Sync other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setScale(readStored());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function apply(next: Step) {
    setScale(next);
    // Canonical 2-decimal form (e.g. "0.90" not "0.9") so the value
    // matches what the CSS selectors in globals.css and the regex in
    // layout.tsx both expect.
    const formatted = next.toFixed(2);
    try {
      localStorage.setItem(STORAGE_KEY, formatted);
    } catch {
      /* localStorage unavailable, ignore */
    }
    document.documentElement.dataset.fontScale = formatted;
  }

  return (
    <div className="space-y-4">
      <input
        type="range"
        min={0}
        max={STEPS.length - 1}
        step={1}
        value={STEPS.indexOf(scale)}
        onChange={(e) => {
          const next = STEPS[Number(e.target.value)];
          if (next != null) apply(next);
        }}
        className="w-full accent-[var(--theme-primary)]"
        aria-label="Tamaño de letra"
      />

      <div className="flex items-end justify-between gap-4 text-muted-foreground" aria-hidden="true">
        <div className="flex flex-col items-center gap-1">
          <span style={{ fontSize: `${0.9 * 16}px` }}>A</span>
          <span className="text-xs">0.9x</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span style={{ fontSize: `${1.0 * 16}px`, fontWeight: 600 }}>
            A
          </span>
          <span className="text-xs">{scale.toFixed(2)}x (actual)</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span style={{ fontSize: `${1.1 * 16}px` }}>A</span>
          <span className="text-xs">1.1x</span>
        </div>
      </div>
    </div>
  );
}
