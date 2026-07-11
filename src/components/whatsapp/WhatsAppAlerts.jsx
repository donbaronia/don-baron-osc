import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Play, Loader2 } from "lucide-react";

const ALERT_KEYS = [
  { key: "alert_boletos", label: "Boletos vencendo" },
  { key: "alert_estoque", label: "Estoque crítico" },
  { key: "alert_margem", label: "Margem abaixo da meta" },
  { key: "alert_fluxo_caixa", label: "Fluxo de caixa negativo" },
  { key: "alert_fornecedor", label: "Fornecedor atrasado" },
  { key: "alert_documentos", label: "Documentos vencendo" },
  { key: "alert_treinamentos", label: "Treinamentos pendentes" },
  { key: "alert_missoes", label: "Missões críticas" },
];

export default function WhatsAppAlerts() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) return;
      base44.entities.WhatsAppConfig.filter({ user_id: u.id })
        .then(list => setConfig(list?.[0] || null))
        .catch(() => {})
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const toggle = (key) => {
    if (!config) return;
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    setSaving(true);
    base44.entities.WhatsAppConfig.update(config.id, { [key]: updated[key] })
      .catch(() => {}).finally(() => setSaving(false));
  };

  const runProactive = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("whatsappProactive", {});
      setResult(res.data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-neutral-500">Carregando configurações...</div>;

  if (!config) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Você ainda não vinculou seu WhatsApp. Vá na aba "Vincular Número" para conectar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-neutral-700">Alertas Proativos</h3>
          {saving && <span className="text-xs text-neutral-400">salvando...</span>}
        </div>
        <div className="space-y-3">
          {ALERT_KEYS.map(a => (
            <div key={a.key} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
              <span className="text-sm text-neutral-700">{a.label}</span>
              <Switch checked={config[a.key] || false} onCheckedChange={() => toggle(a.key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">Resumo Executivo Diário</h3>
            <p className="text-xs text-neutral-500">Enviado automaticamente todos os dias</p>
          </div>
          <Switch
            checked={config.daily_summary_enabled || false}
            onCheckedChange={() => toggle("daily_summary_enabled")}
          />
        </div>
        <p className="text-xs text-neutral-500">Horário: {config.daily_summary_time || "07:30"}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">Verificação Manual</h3>
            <p className="text-xs text-neutral-500">Executa a verificação de alertas agora</p>
          </div>
          <Button onClick={runProactive} disabled={running} className="bg-emerald-600 hover:bg-emerald-700">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Verificar Agora
          </Button>
        </div>
        {result && (
          <div className="mt-4 rounded-lg border border-neutral-100 p-3 text-sm">
            {result.error ? (
              <p className="text-red-600">Erro: {result.error}</p>
            ) : (
              <p className="text-neutral-700">
                {result.total === 0 ? "✅ Nenhum alerta crítico encontrado." : `⚠️ ${result.total} alerta(s) encontrado(s) e notificação(ões) criada(s).`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}