import * as React from "react";
import { cn } from "@/lib/utils";

// Wrapper padronizado para gráficos Recharts — tema Baron aplicado
export function BaronChart({ children, className, height = 280 }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      {children}
    </div>
  );
}

// Cores padrão para séries de gráficos
export const CHART_COLORS = ["#FF7A00", "#22C55E", "#3B82F6", "#A855F7", "#EF4444", "#FACC15"];