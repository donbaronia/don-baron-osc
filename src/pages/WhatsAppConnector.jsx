import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle, RefreshCw, WifiOff, Send, Inbox,
  Webhook, ClipboardList, AlertCircle, CheckCircle2, XCircle, QrCode, Save, Zap,
} from "lucide-react";

export default function WhatsAppConnector() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [form, setForm] = useState({
    instance_id: "",
    instance_token: "",
    client_token: "",
    api_url: "https://api.z-api.com",
    webhook_url: "",
    notifications_enabled: true,
  });

  // Test message form
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [cfgRes, msgs, recentLogs] = await Promise.all([
        base44.functions.invoke("whatsappConnector", { action: "get_config" }),
        base44.entities.WhatsAppMessage.list("-created_date", 20),
        base44.entities.WhatsAppLog.list("-created_date", 20),
      ]);
      const cfg = cfgRes.data?.config;
      setConfig(cfg);
      if (cfg) {
        setForm({
          instance_id: cfg.instance_id || "",
          instance_token: cfg.instance_token || "",
          client_token: cfg.client_token || "",
          api_url: cfg.api_url || "https://api.z-api.com",
          webhook_url: cfg.webhook_url || "",
          notifications_enabled: cfg.notifications_enabled !== false,
        });
        if (cfg.instance_id && cfg.instance_token) {
          const st = await base44.functions.invoke("whatsappConnector", { action: "status" });
          setStatus(st.data);
        }
      }
      setMessages(msgs || []);
      setLogs(recentLogs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); const i = setInterval(loadData, 30000); return () => clearInterval(i); }, [loadData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setTestResult(null);
    try {
      await base44.functions.invoke("whatsappConnector", {
        action: "save_config",
        ...form,
      });
      await loadData();
      // Após salvar, testa automaticamente
      await handleTest();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTest = async () => {
    setActionLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("whatsappConnector", { action: "test_connection" });
      setTestResult(res.data);
      if (res.data?.connection_status) {
        setStatus(res.data);
      }
      await loadData();
    } catch (err) {
      setError(err.message);
      setTestResult({ success: false, error: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGetQr = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke("whatsappConnector", { action: "get_qr" });
      setStatus(res.data);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke("whatsappConnector", { action: "disconnect" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetupWebhook = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke("whatsappConnector", {
        action: "setup_webhook",
        webhook_url: form.webhook_url,
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
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

  const isConfigured = !!(form.instance_id && form.instance_token);
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="WhatsApp Connector"
        subtitle="Camada única de integração com WhatsApp via Z-API."
        actions={
          <Button variant="outline" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Status */}
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
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Provedor</p>
                <p className="text-sm font-medium text-foreground">Z-API</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Número</p>
                <p className="text-sm font-medium text-foreground">{status?.phone_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Instance ID</p>
                <p className="text-sm font-medium text-foreground truncate">{form.instance_id || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notificações</p>
                <p className="text-sm font-medium text-foreground">{form.notifications_enabled ? "Ativas" : "Inativas"}</p>
              </div>
            </div>

            {isConfigured && !isConnected && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={handleGetQr} disabled={actionLoading}>
                  <QrCode className="h-4 w-4" />
                  Obter QR Code
                </Button>
              </div>
            )}
            {isConfigured && isConnected && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="destructive" onClick={handleDisconnect} disabled={actionLoading}>
                  <WifiOff className="h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            )}

            {status?.qr_code && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <img src={status.qr_code} alt="QR Code" className="h-64 w-64 rounded-lg border border-border bg-white p-2" />
                <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp do celular</p>
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <Alert className="mt-4" variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {testResult.success ? (
                    <span>Conexão validada com sucesso! Status: <strong>{testResult.connection_status}</strong>{testResult.phone_number ? ` · ${testResult.phone_number}` : ""}</span>
                  ) : (
                    <span>Erro na conexão: {testResult.error}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Configuração Z-API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instance_id">Instance ID *</Label>
                  <Input
                    id="instance_id"
                    placeholder="Ex: 3C99XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                    value={form.instance_id}
                    onChange={(e) => setForm({ ...form, instance_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instance_token">Instance Token *</Label>
                  <Input
                    id="instance_token"
                    type="password"
                    placeholder="Token da instância"
                    value={form.instance_token}
                    onChange={(e) => setForm({ ...form, instance_token: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client_token">Client Token</Label>
                  <Input
                    id="client_token"
                    type="password"
                    placeholder="Client-Token (header)"
                    value={form.client_token}
                    onChange={(e) => setForm({ ...form, client_token: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_url">URL Base da API</Label>
                  <Input
                    id="api_url"
                    placeholder="https://api.z-api.com"
                    value={form.api_url}
                    onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  placeholder="https://[seu-app].base44.app/api/functions/whatsappConnector/webhook"
                  value={form.webhook_url}
                  onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="notifications_enabled">Notificações do sistema via WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Quando ativo, todos os alertas do sistema usam WhatsApp.</p>
                </div>
                <Switch
                  id="notifications_enabled"
                  checked={form.notifications_enabled}
                  onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={actionLoading || !form.instance_id || !form.instance_token}>
                  <Save className="h-4 w-4" />
                  Salvar e Testar Conexão
                </Button>
                {isConfigured && (
                  <Button type="button" variant="outline" onClick={handleTest} disabled={actionLoading}>
                    <Zap className="h-4 w-4" />
                    Testar Conexão
                  </Button>
                )}
                {form.webhook_url && (
                  <Button type="button" variant="outline" onClick={handleSetupWebhook} disabled={actionLoading}>
                    <Webhook className="h-4 w-4" />
                    Configurar Webhook
                  </Button>
                )}
              </div>
            </form>
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
                <Input
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

        {/* Messages & Logs */}
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Provedor:</strong> Z-API (https://z-api.com)</p>
              <p><strong className="text-foreground">Documentação:</strong> https://z-api.com/api</p>
              <p><strong className="text-foreground">Como obter credenciais:</strong> Crie uma conta em z-api.com → Instances → Nova Instância → copie Instance ID, Instance Token e Client Token.</p>
              <p><strong className="text-foreground">Webhook:</strong> Configure a URL de webhook acima na sua instância da Z-API para receber mensagens.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}