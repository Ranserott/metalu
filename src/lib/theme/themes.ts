export type ThemeId = "azul" | "verde" | "purpura" | "naranja";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  primary: string;
  dark: string;
  darker: string;
  light: string;
};

export const THEMES: Theme[] = [
  {
    id: "azul",
    name: "Azul Corporativo",
    description: "Paleta clásica del sistema",
    primary: "#14679C",
    dark: "#2A4059",
    darker: "#004C63",
    light: "#4FB5E0",
  },
  {
    id: "verde",
    name: "Verde Esmeralda",
    description: "Fresco y natural",
    primary: "#10B981",
    dark: "#047857",
    darker: "#065F46",
    light: "#D1FAE5",
  },
  {
    id: "purpura",
    name: "Púrpura Real",
    description: "Elegante y moderno",
    primary: "#8B5CF6",
    dark: "#6D28D9",
    darker: "#4C1D95",
    light: "#EDE9FE",
  },
  {
    id: "naranja",
    name: "Naranja Sunset",
    description: "Cálido y energético",
    primary: "#F97316",
    dark: "#C2410C",
    darker: "#9A3412",
    light: "#FED7AA",
  },
];

export const DEFAULT_THEME: ThemeId = "azul";

export function getTheme(id: ThemeId | string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
