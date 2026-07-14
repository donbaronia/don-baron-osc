import * as React from "react";
import { cn } from "@/lib/utils";

export function BaronCard({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card shadow-sm transition-colors duration-200 hover:bg-card-hover", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function BaronCardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function BaronCardBody({ className, children, ...props }) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function BaronCardFooter({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 border-t border-border px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}