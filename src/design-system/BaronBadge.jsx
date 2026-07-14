import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        brand: "border-baron-orange/30 bg-baron-orange/15 text-baron-orange",
        success: "border-baron-green/30 bg-baron-green/15 text-baron-green",
        danger: "border-baron-red/30 bg-baron-red/15 text-baron-red",
        warning: "border-baron-yellow/30 bg-baron-yellow/15 text-baron-yellow",
        info: "border-baron-blue/30 bg-baron-blue/15 text-baron-blue",
        neutral: "border-border bg-card text-secondary-info",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function BaronBadge({ className, variant = "default", children }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  );
}