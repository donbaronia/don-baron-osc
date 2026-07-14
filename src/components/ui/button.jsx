import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-baron-orange text-white shadow-lg shadow-baron-orange/20 hover:bg-baron-orange-hover hover:shadow-baron-orange/30",
        destructive:
          "bg-baron-red text-white shadow-lg shadow-baron-red/20 hover:brightness-110",
        outline:
          "border border-border bg-transparent text-secondary-info hover:bg-table-hover hover:border-baron-orange/40 hover:text-primary-info",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-125",
        ghost: "text-secondary-info hover:bg-table-hover hover:text-primary-info",
        link: "text-baron-orange underline-offset-4 hover:underline hover:text-baron-orange-hover",
        success:
          "bg-baron-green text-white shadow-lg shadow-baron-green/20 hover:brightness-110",
        blue:
          "bg-baron-blue text-white shadow-lg shadow-baron-blue/20 hover:brightness-110",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }