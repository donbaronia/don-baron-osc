import * as React from "react";
import { cn } from "@/lib/utils";

// Input padronizado — placeholder elegante, focus laranja, borda padronizada
export const BaronInput = React.forwardRef(({ className, icon: Icon, ...props }, ref) => (
  <div className="relative w-full">
    {Icon && (
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-small-info" />
    )}
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-primary-info shadow-sm transition-all duration-200 placeholder:text-small-info focus-visible:border-baron-orange focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-baron-orange disabled:cursor-not-allowed disabled:opacity-50",
        Icon && "pl-9",
        className
      )}
      {...props}
    />
  </div>
));
BaronInput.displayName = "BaronInput";

export const BaronTextarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-primary-info shadow-sm transition-all duration-200 placeholder:text-small-info focus-visible:border-baron-orange focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-baron-orange disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
BaronTextarea.displayName = "BaronTextarea";

// Select padronizado — usa select nativo estilizado
export const BaronSelect = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-primary-info shadow-sm transition-all duration-200 focus-visible:border-baron-orange focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-baron-orange disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
BaronSelect.displayName = "BaronSelect";