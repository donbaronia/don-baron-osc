import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Info, CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from "lucide-react"

const bdsAlertVariants = cva(
  "relative w-full rounded-lg border p-4 pl-12 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5",
  {
    variants: {
      variant: {
        info: "border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600",
        warning: "border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600",
        error: "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600",
        critical: "border-red-900 bg-red-950 text-red-50 [&>svg]:text-red-400",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  critical: ShieldAlert,
}

const LABELS = {
  info: "Informação",
  success: "Sucesso",
  warning: "Atenção",
  error: "Erro",
  critical: "Crítico",
}

export function BDSAlert({ variant = "info", title, children, className, ...props }) {
  const Icon = ICONS[variant]
  return (
    <div role="alert" className={cn(bdsAlertVariants({ variant }), className)} {...props}>
      <Icon />
      {title && <p className="font-semibold leading-tight tracking-tight">{title}</p>}
      {children && <div className={cn("text-sm", title && "mt-1")}>{children}</div>}
    </div>
  )
}

export { bdsAlertVariants, LABELS as BDS_ALERT_LABELS }