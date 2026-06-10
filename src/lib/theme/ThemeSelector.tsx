"use client";

import { THEMES, ThemeId } from "./themes";
import { useTheme } from "./ThemeContext";
import { Check } from "lucide-react";

export function ThemeSelector() {
  const { theme, setThemeId } = useTheme();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {THEMES.map((t) => {
        const selected = t.id === theme.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setThemeId(t.id as ThemeId)}
            className={`relative text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selected
                ? "border-[var(--theme-primary)] shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {selected && (
              <div
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{ background: t.primary }}
              >
                <Check className="w-4 h-4" />
              </div>
            )}

            <div className="flex gap-1 mb-3 h-12">
              <div
                className="flex-1 rounded"
                style={{ background: t.primary }}
                title="primary"
              />
              <div
                className="flex-1 rounded"
                style={{ background: t.dark }}
                title="dark"
              />
              <div
                className="flex-1 rounded"
                style={{ background: t.light }}
                title="light"
              />
            </div>

            <div className="font-semibold text-sm text-gray-800">{t.name}</div>
            <div className="text-xs text-gray-500 mt-1">{t.description}</div>

            <div
              className="mt-3 w-full text-xs font-medium py-1.5 rounded text-white text-center"
              style={{
                background: `linear-gradient(to right, ${t.primary}, ${t.dark})`,
              }}
            >
              {selected ? "Tema activo" : "Aplicar tema"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
