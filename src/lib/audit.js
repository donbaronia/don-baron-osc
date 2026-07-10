import { base44 } from "@/api/base44Client";

// Registro simples de auditoria no frontend.
// Regras de negócio críticas devem, no futuro, validar no backend.
export async function logAudit({ user, module, action, details }) {
  try {
    await base44.entities.AuditLog.create({
      user_name: user?.full_name || "Desconhecido",
      user_email: user?.email || "",
      module: module || "",
      action: action || "",
      details: details || "",
      device: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
  } catch (e) {
    // Auditoria nunca deve quebrar a experiência do usuário.
    console.error("Falha ao registrar auditoria", e);
  }
}