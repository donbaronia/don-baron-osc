/**
 * DON BARON DESIGN SYSTEM 2.0 — Cores (única fonte de verdade)
 * Espelha os tokens de src/index.css. Toda cor do app vem exclusivamente daqui.
 */
export const colors = {
  background: "#0F1115",
  surface: "#171B22",
  surfaceHover: "#202733",
  border: "#2C3644",
  textPrimary: "#FFFFFF",
  textSecondary: "#B7C0CC",
  textDisabled: "#7D8795",

  primary: "#FF7A00", // Laranja Baron
  green: "#18C37E",
  blue: "#3B82F6",
  red: "#F04438",
  yellow: "#F59E0B",
  purple: "#9B51E0",
};

export const semanticColors = {
  success: colors.green,
  danger: colors.red,
  warning: colors.yellow,
  info: colors.blue,
  primary: colors.primary,
  neutral: colors.textDisabled,
};

// Mapeia nome semântico -> classe Tailwind (tokens CSS) para uso em JSX
export const colorClass = {
  primary: "text-baron-orange",
  green: "text-baron-green",
  blue: "text-baron-blue",
  red: "text-baron-red",
  yellow: "text-baron-yellow",
  purple: "text-baron-purple",
  textPrimary: "text-foreground",
  textSecondary: "text-secondary-info",
  textDisabled: "text-small-info",
};

export default colors;