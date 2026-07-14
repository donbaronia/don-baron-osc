/**
 * DON BARON CORE — NotificationManager
 *
 * Centraliza notificacoes ao usuario (toast).
 * Garante feedback visual para toda acao executada.
 */
import { useToast } from "@/components/ui/use-toast";

let toastFn = null;

export const NotificationManager = {
  setToastHandler(fn) {
    toastFn = fn;
  },

  success(message, description) {
    if (toastFn) toastFn({ title: message, description });
  },

  error(message, description) {
    if (toastFn) toastFn({ title: message, description, variant: "destructive" });
  },

  info(message, description) {
    if (toastFn) toastFn({ title: message, description });
  },
};

// Hook para inicializar o NotificationManager no Layout.
export function useNotificationInit() {
  const { toast } = useToast();
  NotificationManager.setToastHandler(toast);
}

export default NotificationManager;