import * as React from "react";
import { cn } from "@/lib/utils";

// Modal padronizado — Confirmação, Exclusão, Edição, Upload, Visualização
export function BaronModal({
  open,
  onClose,
  title,
  description,
  size = "md", // sm | md | lg | xl
  children,
  footer,
}) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative z-10 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-fade-in", sizes[size])}>
        {(title || description) && (
          <div className="border-b border-border px-6 py-4">
            {title && <h2 className="text-title text-base font-semibold">{title}</h2>}
            {description && <p className="text-small-info mt-1 text-sm">{description}</p>}
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Diálogo de confirmação reutilizável
export function BaronConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja continuar?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger", // danger | primary | success
}) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaronModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <BaronBtn onClick={onClose} variant="secondary" size="sm" disabled={loading}>
            {cancelLabel}
          </BaronBtn>
          <BaronBtn onClick={handleConfirm} variant={variant} size="sm" loading={loading}>
            {confirmLabel}
          </BaronBtn>
        </>
      }
    >
      <p className="text-secondary-info text-sm">{message}</p>
    </BaronModal>
  );
}

// Botão local simples (evita import circular)
import { Loader2 } from "lucide-react";
function BaronBtn({ children, variant = "primary", size = "default", loading, disabled, ...props }) {
  const variants = {
    primary: "bg-baron-orange text-white hover:bg-baron-orange-hover",
    secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-card-hover",
    danger: "bg-baron-red text-white hover:brightness-110",
    success: "bg-baron-green text-white hover:brightness-110",
  };
  const sizes = { default: "h-10 px-4 py-2 text-sm", sm: "h-9 px-3 text-xs", xs: "h-7 px-2 text-xs" };
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]", variants[variant], sizes[size])}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}