import { getSettings } from "@/modules/settings/services/settingService";
import { SettingTable } from "@/modules/settings/components/SettingTable";
import { ThemeSelector } from "@/lib/theme/ThemeSelector";
import { Palette } from "lucide-react";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configuracion</h1>
          <p className="text-sm text-gray-500">Configuracion del sistema</p>
        </div>
      </div>

      <section className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{
            background: "linear-gradient(to right, var(--theme-primary), var(--theme-dark))",
          }}
        >
          <Palette className="w-4 h-4 text-white" />
          <span className="text-white font-semibold text-xs uppercase tracking-wide">
            Tema
          </span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Elegí una paleta de colores para esta sesión. El cambio se aplica a toda la
            interfaz (botones principales, badges, encabezados) y se conserva al navegar
            entre páginas. Al cerrar el navegador, vuelve al tema por defecto.
          </p>
          <ThemeSelector />
        </div>
      </section>

      <SettingTable data={settings} />
    </div>
  );
}
