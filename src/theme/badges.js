/** DON BARON DESIGN SYSTEM 2.0 — Badges. Variante única, usada por todo o sistema. */
export const badgeVariants = {
  success: "border-baron-green/30 bg-baron-green/15 text-baron-green hover:bg-baron-green/25",
  warning: "border-baron-yellow/30 bg-baron-yellow/15 text-baron-yellow hover:bg-baron-yellow/25",
  danger: "border-baron-red/30 bg-baron-red/15 text-baron-red hover:bg-baron-red/25",
  info: "border-baron-blue/30 bg-baron-blue/15 text-baron-blue hover:bg-baron-blue/25",
  gray: "border-border bg-secondary text-secondary-info hover:bg-secondary/80",
  orange: "border-baron-orange/30 bg-baron-orange/15 text-baron-orange hover:bg-baron-orange/25",
  purple: "border-baron-purple/30 bg-baron-purple/15 text-baron-purple hover:bg-baron-purple/25",
  blue: "border-baron-blue/30 bg-baron-blue/15 text-baron-blue hover:bg-baron-blue/25",
  green: "border-baron-green/30 bg-baron-green/15 text-baron-green hover:bg-baron-green/25",
  // Semânticos de domínio
  materia: "border-baron-blue/30 bg-baron-blue/15 text-baron-blue hover:bg-baron-blue/25",
  producao: "border-baron-orange/30 bg-baron-orange/15 text-baron-orange hover:bg-baron-orange/25",
  acabado: "border-baron-green/30 bg-baron-green/15 text-baron-green hover:bg-baron-green/25",
  marketing: "border-baron-purple/30 bg-baron-purple/15 text-baron-purple hover:bg-baron-purple/25",
  perda: "border-baron-red/30 bg-baron-red/15 text-baron-red hover:bg-baron-red/25",
  transferencia: "border-baron-yellow/30 bg-baron-yellow/15 text-baron-yellow hover:bg-baron-yellow/25",
  inventario: "border-border bg-secondary text-secondary-info hover:bg-secondary/80",
  outline: "border-border text-secondary-info",
};

export const badgeBase =
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export default { badgeVariants, badgeBase };