/** DON BARON DESIGN SYSTEM 2.0 — Animações suaves (hover/fade/loading). */
export const durations = { fast: 150, base: 200, slow: 300 };

export const animations = {
  fadeIn: "fade-in 0.3s ease-out",
  slideIn: "slide-in 0.25s ease-out",
};

export const animationClass = {
  fadeIn: "animate-fade-in",
  hover: "transition-all duration-200",
  loading: "animate-spin",
};

export default { durations, animations, animationClass };