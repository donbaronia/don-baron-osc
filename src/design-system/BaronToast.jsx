import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-primary-info",
        success: "border-baron-green/30 bg-baron-green/10 text-baron-green",
        error: "border-baron-red/30 bg-baron-red/10 text-baron-red",
        warning: "border-baron-yellow/30 bg-baron-yellow/10 text-baron-yellow",
        info: "border-baron-blue/30 bg-baron-blue/10 text-baron-blue",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

// Container de toast padronizado — desaparece automaticamente, fica registrado
export function BaronToast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(toastVariants({ variant: t.variant || "default" }), "max-w-sm animate-fade-in")}
        >
          <div className="flex-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.message && <p className="text-xs opacity-90">{t.message}</p>}
          </div>
          <button onClick={() => onDismiss?.(t.id)} className="text-small-info hover:text-primary-info">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// Hook utilitário para toasts
export function useBaronToasts() {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => dismiss(id), toast.duration || 4000);
    return id;
  }, [dismiss]);

  return { toasts, push, dismiss };
}