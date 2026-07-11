import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const bdsButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        save: "bg-bds-save text-bds-save-fg shadow hover:brightness-110",
        cancel: "bg-bds-cancel text-bds-cancel-fg shadow-sm hover:brightness-95",
        delete: "bg-bds-delete text-bds-delete-fg shadow hover:brightness-110",
        edit: "bg-bds-edit text-bds-edit-fg shadow hover:brightness-110",
        duplicate: "bg-bds-duplicate text-bds-duplicate-fg shadow hover:brightness-110",
        export: "bg-bds-export text-bds-export-fg shadow hover:brightness-110",
        print: "bg-bds-print text-bds-print-fg shadow hover:brightness-110",
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
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

const BDSButton = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(bdsButtonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
BDSButton.displayName = "BDSButton"

export { BDSButton, bdsButtonVariants }