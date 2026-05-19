import { getSettings } from "@/modules/settings/services/settingService";
import { SettingTable } from "@/modules/settings/components/SettingTable";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configuracion</h1>
          <p className="text-sm text-gray-500">Configuracion del sistema</p>
        </div>
      </div>

      <SettingTable data={settings} />
    </div>
  );
}