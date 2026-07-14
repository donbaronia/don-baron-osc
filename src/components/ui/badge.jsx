import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-baron-orange/30 bg-baron-orange/15 text-baron-orange hover:bg-baron-orange/25",
        secondary:
          "border-border bg-secondary text-secondary-info hover:bg-secondary/80",
        destructive:
          "border-baron-red/30 bg-baron-red/15 text-baron-red hover:bg-baron-red/25",
        success:
          "border-baron-green/30 bg-baron-green/15 text-baron-green hover:bg-baron-green/25",
        blue:
          "border-baron-blue/30 bg-baron-blue/15 text-baron-blue hover:bg-baron-blue/25",
        purple:
          "border-baron-purple/30 bg-baron-purple/15 text-baron-purple hover:bg-baron-purple/25",
        pink:
          "border-baron-pink/30 bg-baron-pink/15 text-baron-pink hover:bg-baron-pink/25",
        yellow:
          "border-baron-yellow/30 bg-baron-yellow/15 text-baron-yellow hover:bg-baron-yellow/25",
        outline: "border-border text-secondary-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }