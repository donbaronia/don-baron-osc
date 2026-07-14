import * as React from "react";
import { cva } from "class-variance-authority";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-baron-orange text-white shadow-lg shadow-baron-orange/20 hover:bg-baron-orange-hover hover:shadow-baron-orange/30",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-card-hover hover:text-primary-info",
        ghost: "text-secondary-info hover:bg-card-hover hover:text-primary-info",
        outline: "border border-border bg-transparent text-secondary-info hover:bg-card-hover hover:border-baron-orange/40 hover:text-primary-info",
        danger: "bg-baron-red text-white shadow-lg shadow-baron-red/20 hover:brightness-110",
        success: "bg-baron-green text-white shadow-lg shadow-baron-green/20 hover:brightness-110",
        warning: "bg-baron-yellow text-background shadow-lg shadow-baron-yellow/20 hover:brightness-110",
        link: "text-baron-orange underline-offset-4 hover:underline hover:text-baron-orange-hover",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        xs: "h-7 rounded px-2 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export function BaronButton({
  className,
  variant = "primary",
  size = "default",
  loading = false,
  state, // "success" | "error"
  children,
  disabled,
  ...props
}) {
  const stateClass =
    state === "success"
      ? "bg-baron-green text-white border-baron-green"
      : state === "error"
        ? "bg-baron-red text-white border-baron-red"
        : "";

  return (
    <button
      className={cn(buttonVariants({ variant, size, className }), stateClass)}
      disabled={disabled || loading || state === "success" || state === "error"}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {state === "success" && <CheckCircle2 className="h-4 w-4" />}
      {state === "error" && <XCircle className="h-4 w-4" />}
      {children}
    </button>
  );
}