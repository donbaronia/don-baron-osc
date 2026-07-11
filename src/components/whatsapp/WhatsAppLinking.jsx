import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Smartphone, CheckCircle2, XCircle } from "lucide-react";

export default function WhatsAppLinking() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const whatsappUrl = base44.agents.getWhatsAppConnectURL("baron_whatsapp");

  const load = () => {
    setLoading(true);
    base44.entities.WhatsAppConfig.list()
      .then(setConfigs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const myConfig = configs.find(c => c.user_id === user?.id);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-emerald-900">Vincular seu número de WhatsApp</h3>
            <p className="mt-1 text-xs text-emerald-700">
              O vínculo será realizado apenas uma vez. Após validado, o número ficará registrado. Caso seja alterado, nova validação será necessária.
            </p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700">
                <ExternalLink className="h-4 w-4" />
                Conectar WhatsApp
              </Button>
            </a>
            {myConfig && (
              <p className="mt-2 text-xs text-emerald-700">
                Status: {myConfig.linked ? "✅ Vinculado" : "⏳ Pendente"} {myConfig.whatsapp_number ? `· ${myConfig.whatsapp_number}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-700">Usuários Vinculados</h3>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        {configs.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum usuário vinculado ainda.</p>
        ) : (
          <div className="space-y-2">
            {configs.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3">
                {c.linked ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-neutral-300" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-800">{c.user_name || c.user_email || "Usuário"}</p>
                  <p className="text-xs text-neutral-500">{c.whatsapp_number || "Sem número"} · {c.role || "sem perfil"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}