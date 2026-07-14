/**
 * DON BARON CORE — HealthCenter
 *
 * Monitor de saude do sistema em tempo real.
 * Mostra status de cada servico: ONLINE / WARNING / OFFLINE + latencia + ultimo erro.
 *
 * Nao altera layout, cores ou menus. Apenas um componente que pode ser
 * integrado na pagina SaudeSistema existente.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, XCircle, RefreshCw, Database, Cloud, Bot, MessageSquare, FileText } from "lucide-react";

const SERVICES = [
  { key: "database", label: "Banco de Dados", icon: Database, entity: "Product", method: "list" },
  { key: "storage", label: "Storage", icon: Cloud, entity: "DBDocument", method: "list" },
  { key: "auth", label: "Autenticacao", icon: CheckCircle2, entity: null, method: "auth" },
  { key: "ia", label: "IA (Baron)", icon: Bot, entity: null, method: "llm" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, entity: "WhatsAppConnection", method: "list" },
  { key: "documentos", label: "Documentos", icon: FileText, entity: "DBDocument", method: "list" },
  { key: "financeiro", label: "Financeiro", icon: Database, entity: "Payment", method: "list" },
  { key: "estoque", label: "Estoque", icon: Database, entity: "Product", method: "list" },
];

async function checkService(svc) {
  const t0 = performance.now();
  try {
    if (svc.method === "auth") {
      const user = await base44.auth.me();
      return { status: user ? "ONLINE" : "OFFLINE", latency: Math.round(performance.now() - t0), error: null };
    }
    if (svc.method === "llm") {
      // IA check — quick LLM call
      const res = await base44.integrations.Core.InvokeLLM({ prompt: "ping" });
      return { status: res ? "ONLINE" : "OFFLINE", latency: Math.round(performance.now() - t0), error: null };
    }
    if (svc.method === "list" && svc.entity) {
      await base44.entities[svc.entity].list(1);
      return { status: "ONLINE", latency: Math.round(performance.now() - t0), error: null };
    }
    return { status: "ONLINE", latency: 0, error: null };
  } catch (e) {
    return { status: "OFFLINE", latency: Math.round(performance.now() - t0), error: e.message };
  }
}

export default function HealthCenter() {
  const [health, setHealth] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    const results = {};
    await Promise.all(
      SERVICES.map(async (svc) => {
        results[svc.key] = await checkService(svc);
      })
    );
    setHealth(results);
    setLastCheck(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const onlineCount = Object.values(health).filter((h) => h.status === "ONLINE").length;
  const offlineCount = Object.values(health).filter((h) => h.status === "OFFLINE").length;
  const overall = offlineCount === 0 ? "ONLINE" : offlineCount === SERVICES.length ? "OFFLINE" : "WARNING";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant={overall === "ONLINE" ? "default" : "destructive"}
            className={`text-sm ${overall === "ONLINE" ? "bg-baron-success text-white" : overall === "WARNING" ? "bg-baron-alert text-black" : "bg-baron-error text-white"}`}
          >
            {overall === "ONLINE" ? "Sistema Online" : overall === "WARNING" ? "Atencao" : "Sistema Offline"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {onlineCount} online · {offlineCount} offline
            {lastCheck && ` · atualizado: ${new Date(lastCheck).toLocaleTimeString()}`}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={runCheck} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((svc) => {
          const h = health[svc.key] || { status: "...", latency: 0, error: null };
          const Icon = svc.icon;
          const isOnline = h.status === "ONLINE";
          const isOffline = h.status === "OFFLINE";
          return (
            <Card key={svc.key} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{svc.label}</span>
                </div>
                {isOnline ? (
                  <CheckCircle2 className="h-5 w-5 text-baron-success" />
                ) : isOffline ? (
                  <XCircle className="h-5 w-5 text-baron-error" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-baron-alert" />
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs font-semibold ${isOnline ? "text-baron-success" : isOffline ? "text-baron-error" : "text-baron-alert"}`}>
                  {h.status}
                </span>
                {h.latency > 0 && <span className="text-xs text-muted-foreground">{h.latency}ms</span>}
              </div>
              {h.error && (
                <p className="mt-2 text-xs text-destructive line-clamp-2" title={h.error}>
                  {h.error}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}