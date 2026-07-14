// Paleta oficial Don Baron Enterprise 2.0
// Valores hex e HSL (para uso em JS quando necessário).
// No JSX, usar sempre as classes Tailwind mapeadas (bg-baron-orange, etc.)

export const BARON_COLORS = {
  // Superfícies
  background: "#0F1115",
  sidebar: "#13171D",
  header: "#171B22",
  card: "#181C22",
  hover: "#1F2630",
  border: "#2B3442",

  // Texto
  white: "#F8FAFC",
  textSecondary: "#AAB2BF",

  // Marca
  orange: "#FF7A00",
  orangeHover: "#FF922B",
  blue: "#3B82F6",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#FACC15",

  // Semânticos (alias)
  success: "#22C55E",
  warning: "#FACC15",
  danger: "#EF4444",
  info: "#3B82F6",
  brand: "#FF7A00",
};

// Mapeamento de valor semântico → cor (para destaque em tabelas)
export const VALUE_COLORS = {
  product: "text-primary-info", // Branco
  quantity: "text-baron-green", // Verde
  value: "text-baron-orange", // Laranja
  expiry: "text-baron-yellow", // Amarelo
  loss: "text-baron-red", // Vermelho
  neutral: "text-secondary-info",
};