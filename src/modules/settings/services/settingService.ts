import { SettingInput } from "../validations/settingSchemas";

const mockSettings = [
  {
    id: "1",
    key: "company_name",
    value: "Metalurgica",
    description: "Nombre de la empresa",
    updatedAt: new Date(),
  },
  {
    id: "2",
    key: "invoice_series",
    value: "A",
    description: "Serie de facturas por defecto",
    updatedAt: new Date(),
  },
  {
    id: "3",
    key: "tax_rate",
    value: "16",
    description: "Tasa de impuesto (%)",
    updatedAt: new Date(),
  },
];

export async function getSettings() {
  return mockSettings;
}

export async function getSettingById(id: string) {
  return mockSettings.find((s) => s.id === id) || null;
}

export async function getSettingByKey(key: string) {
  return mockSettings.find((s) => s.key === key) || null;
}

export async function createSetting(data: SettingInput) {
  return { ...data, id: Date.now().toString(), updatedAt: new Date() };
}

export async function updateSetting(id: string, data: Partial<SettingInput>) {
  return { ...mockSettings[0], ...data, id, updatedAt: new Date() };
}

export async function deleteSetting(id: string) {
  return { id };
}