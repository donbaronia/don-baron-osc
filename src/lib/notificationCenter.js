import { base44 } from "@/api/base44Client";

/**
 * Central de Notificacoes — DON BARON OS
 *
 * Todos os eventos do sistema que precisam notificar um usuario passam por aqui.
 * Quando o WhatsApp Connector esta conectado, as notificacoes sao enviadas via WhatsApp.
 *
 * Uso:
 *   import { notify } from "@/lib/notificationCenter";
 *   await notify({ title, message, category, module, phone_number, source_event });
 */

export async function notify({ title, message, category = "info", module = "sistema", phone_number, source_event, action_url, metadata }) {
  try {
    // 1. Sempre cria a notificacao no sistema
    const notification = await base44.entities.Notification.create({
      title,
      message,
      category,
      module,
      action_url,
      metadata: { ...metadata, source_event },
    });

    // 2. Se houver WhatsApp conectado e notificacoes habilitadas, envia via WhatsApp
    try {
      const connections = await base44.entities.WhatsAppConnection.list("-created_date", 1);
      const conn = connections[0];

      if (conn && conn.connection_status === "connected" && conn.notifications_enabled) {
        const targetPhone = phone_number || conn.phone_number;
        if (targetPhone) {
          await sendWhatsAppMessage({
            phone_number: targetPhone,
            message_text: `*${title}*\n\n${message}`,
            source_module: module,
            source_event: source_event || "notification",
          });
        }
      }
    } catch (waError) {
      // WhatsApp falhou — a notificacao no sistema ja foi criada
      console.warn("WhatsApp notification failed:", waError?.message);
    }

    return notification;
  } catch (error) {
    console.error("notify() failed:", error);
    return null;
  }
}

export async function sendWhatsAppMessage({ phone_number, message_text, source_module = "sistema", source_event, message_type = "text" }) {
  try {
    const response = await base44.functions.invoke("whatsappConnector", {
      action: "send_message",
      phone_number,
      message_text,
      source_module,
      source_event,
      message_type,
    });
    return response.data;
  } catch (error) {
    console.error("sendWhatsAppMessage() failed:", error);
    return { success: false, error: error.message };
  }
}

export async function getWhatsAppStatus() {
  try {
    const response = await base44.functions.invoke("whatsappConnector", { action: "status" });
    return response.data;
  } catch (error) {
    console.error("getWhatsAppStatus() failed:", error);
    return { connection_status: "error", error: error.message };
  }
}