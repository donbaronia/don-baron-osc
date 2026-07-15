/** DON BARON DESIGN SYSTEM 2.0 — Barril de tokens. Única fonte de verdade. */
export { colors, semanticColors, colorClass } from "./colors";
export { spacing, gap, padding, margin, spaceClass } from "./spacing";
export { fontFamily, fontWeights, fontSizes, dashboard, textClass } from "./typography";
export { radius, radiusClass } from "./radius";
export { shadows, shadowClass } from "./shadows";
export { durations, animations, animationClass } from "./animations";
export { badgeVariants, badgeBase } from "./badges";
export { buttonVariants, buttonSizes, buttonBase } from "./buttons";

// Ícones — biblioteca única: lucide-react (importe os ícones diretamente de "lucide-react").

// Config padrão de DataGrid
export const gridDefaults = {
  pageSize: 10,
  rowHeight: 44,
  emptyText: "Nenhum registro encontrado.",
  searchPlaceholder: "Buscar...",
};

// Config padrão de formulários
export const formDefaults = {
  inputHeight: 44,
  inputRadius: 10,
  focusColor: "baron-orange",
  placeholderColor: "text-small-info",
};

export { default as colorsDefaults } from "./colors";
export { default as spacingDefaults } from "./spacing";