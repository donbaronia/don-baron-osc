/** DON BARON DESIGN SYSTEM 2.0 — Botões. Variante única, nunca criar botão diretamente. */
export const buttonVariants = {
  primary: "bg-baron-orange text-white shadow-lg shadow-baron-orange/20 hover:bg-baron-orange-hover",
  secondary: "bg-secondary text-secondary-info border border-border hover:bg-table-hover hover:text-foreground",
  danger: "bg-baron-red text-white shadow-lg shadow-baron-red/20 hover:brightness-110",
  success: "bg-baron-green text-white shadow-lg shadow-baron-green/20 hover:brightness-110",
  ghost: "text-secondary-info hover:bg-table-hover hover:text-foreground",
  outline: "border border-border bg-transparent text-secondary-info hover:bg-table-hover hover:border-baron-orange/40 hover:text-foreground",
  blue: "bg-baron-blue text-white shadow-lg shadow-baron-blue/20 hover:brightness-110",
  link: "text-baron-orange underline-offset-4 hover:underline hover:text-baron-orange-hover",
};

export const buttonSizes = {
  small: "h-8 rounded-[10px] px-3 text-xs",
  medium: "h-10 rounded-[10px] px-4 text-sm",
  large: "h-11 rounded-[10px] px-8 text-base",
  icon: "h-10 w-10 rounded-[10px]",
};

export const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baron-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0";

export default { buttonVariants, buttonSizes, buttonBase };