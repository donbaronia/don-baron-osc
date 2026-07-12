import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle, RefreshCw, Wifi, WifiOff, Activity, Send, Inbox,
  Webhook, ClipboardList, AlertCircle, CheckCircle2, XCircle, QrCode,
} from "lucide-react";

export default function WhatsAppConnector() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [statusRes, msgs, recentLogs] = await Promise.all([
        base44.functions.invoke("whatsappConnector", { action: "status" }),
        base44.entities.WhatsAppMessage.list("-created_date", 20),
        base44.entities.WhatsAppLog.list("-created_date", 20),
      ]);
      setStatus(statusRes.data);
      setMessages(msgs || []);
      setLogs(recentLogs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, [loadData]);

  const handleAction = async (action) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("whatsappConnector", { action });
      setStatus(res.data);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testPhone || !testMessage) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke("whatsappConnector", {
        action: "send_message",
        phone_number: testPhone,
        message_text: testMessage,
        source_module: "whatsapp_connector",
        source_event: "test_message",
      });
      setTestPhone("");
      setTestMessage("");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isConfigured = status?.configured !== false;
  const isConnected = status?.connection_status === "connected";

  const statusBadge = (s) => {
    const map = {
      connected: { label: "Conectado", variant: "default", icon: CheckCircle2 },
      disconnected: { label: "Desconectado", variant: "secondary", icon: XCircle },
      connecting: { label: "Conectando...", variant: "secondary", icon: RefreshCw },
      qr_code: { label: "Aguardando QR", variant: "secondary", icon: QrCode },
      error: { label: "Erro", variant: "destructive", icon: AlertCircle },
    };
    const conf = map[s] || map.disconnected;
    const Icon = conf.icon;
    return <Badge variant={conf.variant} className="gap-1"><Icon className="h-3 w-3" />{conf.label}</Badge>;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="WhatsApp Connector"
        subtitle="Centralização de toda comunicação via WhatsApp."
        actions={
          <Button variant="outline" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Status & Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Status da Conexão
              </span>
              {statusBadge(status?.connection_status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Provedor</p>
                <p className="text-sm font-medium text-foreground">Evolution API</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Número</p>
                <p className="text-sm font-medium text-foreground">{status?.phone_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Instância</p>
                <p className="text-sm font-medium text-foreground">{status?.instance_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">API URL</p>
                <p className="text-sm font-medium text-foreground truncate">{status?.api_url || "—"}</p>
              </div>
            </div>

            {!isConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">Credenciais não configuradas</p>
                  <p className="text-xs">Configure as seguintes variáveis de ambiente em Settings → Environment Variables:</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    <li><strong>EVOLUTION_API_URL</strong> — URL base da sua instância Evolution API</li>
                    <li><strong>EVOLUTION_API_TOKEN</strong> — Token de autenticação (Global API Key)</li>
                    <li><strong>EVOLUTION_INSTANCE_NAME</strong> — Nome da instância criada na Evolution API</li>
                  </ul>
                  <p className="text-xs">Após configurar, configure o webhook na Evolution API apontando para:</p>
                  <code className="block text-xs bg-muted rounded p-2 break-all">{status?.webhook_url}</code>
                </AlertDescription>
              </Alert>
            )}

            {isConfigured && !isConnected && (
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">WhatsApp não conectado</p>
                  <p className="text-xs">Clique em "Obter QR Code" para gerar o código e escaneá-lo com seu celular.</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {isConfigured && !isConnected && (
                <Button onClick={() => handleAction("get_qr")} disabled={actionLoading}>
                  <QrCode className="h-4 w-4" />
                  Obter QR Code
                </Button>
              )}
              {isConfigured && isConnected && (
                <Button variant="outline" onClick={() => handleAction("reconnect")} disabled={actionLoading}>
                  <RefreshCw className={`h-4 w-4 ${actionLoading ? "animate-spin" : ""}`} />
                  Reconectar
                </Button>
              )}
              {isConfigured && isConnected && (
                <Button variant="destructive" onClick={() => handleAction("disconnect")} disabled={actionLoading}>
                  <WifiOff className="h-4 w-4" />
                  Desconectar
                </Button>
              )}
              {isConfigured && (
                <Button variant="outline" onClick={() => handleAction("health_check")} disabled={actionLoading}>
                  <Activity className="h-4 w-4" />
                  Health Check
                </Button>
              )}
            </div>

            {status?.qr_code && (
              <div className="flex flex-col items-center gap-2 py-4">
                <img src={status.qr_code} alt="QR Code" className="h-64 w-64 rounded-lg border border-border bg-white p-2" />
                <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp do celular</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Message */}
        {isConfigured && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Enviar Mensagem de Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTest} className="space-y-3">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Número (ex: 5585999999999)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <textarea
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Mensagem"
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
                <Button type="submit" disabled={actionLoading || !testPhone || !testMessage}>
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                Mensagens Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem registrada.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {messages.map((m) => (
                    <div key={m.id} className="flex flex-col gap-1 border-b border-border pb-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${m.direction === "sent" ? "text-primary" : "text-baron-success"}`}>
                          {m.direction === "sent" ? "→ Enviada" : "← Recebida"} · {m.phone_number}
                        </span>
                        <Badge variant="secondary" className="text-xs">{m.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.message_text}</p>
                      <span className="text-[10px] text-muted-foreground">{m.source_module}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum log registrado.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-2 border-b border-border pb-2">
                      <Badge variant={l.level === "error" ? "destructive" : l.level === "warning" ? "secondary" : "outline"} className="text-xs shrink-0">
                        {l.level}
                      </Badge>
                      <div>
                        <p className="text-xs text-foreground">{l.message}</p>
                        <span className="text-[10px] text-muted-foreground">{l.log_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Webhook Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Webhook & Integração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">URL do Webhook (configure na Evolution API):</p>
              <code className="block text-xs bg-muted rounded p-2 break-all">
                {status?.webhook_url || "—"}
              </code>
            </div>
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Provedor:</strong> Evolution API (open-source, self-hosted)</p>
              <p><strong className="text-foreground">Documentação:</strong> https://doc.evolution-api.com</p>
              <p><strong className="text-foreground">Eventos suportados:</strong> messages.upsert, messages.update, connection.update</p>
              <p><strong className="text-foreground">Central de Notificações:</strong> Todos os eventos do sistema (pagamentos, boletos, estoque, missões) são enviados via este connector quando ativo.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}