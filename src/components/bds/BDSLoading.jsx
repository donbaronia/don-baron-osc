import React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

/**
 * Feedback de progresso do Baron Design System.
 * Nunca deixar o usuário esperando sem feedback.
 */
export function BDSSpinner({ className, label }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-neutral-500", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {label || "Carregando..."}
    </div>
  )
}

export function BDSLoadingOverlay({ visible, label = "Processando..." }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        <p className="text-sm font-medium text-neutral-600">{label}</p>
      </div>
    </div>
  )
}

export function BDSSkeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-neutral-200", className)} />
}

export function BDSPageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <BDSSkeleton className="h-8 w-64" />
      <BDSSkeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <BDSSkeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <BDSSkeleton className="h-64 w-full" />
    </div>
  )
}