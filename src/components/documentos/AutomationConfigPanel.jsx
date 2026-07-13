import React, { useEffect, useState } from "react";
import { loadAutomationConfig, saveAutomationConfig } from "@/lib/automationConfig";
import { Core } from "@/lib/coreEngine";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Save, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const TOGGLES = [
  { key: "auto_approve_boletos", label: "Aprovar boletos automaticamente", desc: "Alta confiança → cria Conta a Pagar sem intervenção", risk: false },
  { key: "auto_create_accounts", label: "Criar contas a pagar automaticamente", desc: "Gera o lançamento financeiro ao aprovar", risk: false },
  { key: "auto_approve_nf_known_products", label: "Aprovar notas com produtos conhecidos", desc: "Todos os produtos reconhecidos → entrada automática", risk: false },
  { key: "auto_update_stock", label: "Atualizar estoque automaticamente", desc: "Entrada de produtos via nota fiscal", risk: false },
  { key: "auto_update_cmv", label: "Atualizar CMV automaticamente", desc: "Recalcula custo médio após entrada", risk: false },
  { key: "learn_aliases", label: "Aprender equivalências de produtos", desc: "Guarda nomes diferentes permanentemente", risk: false },
  { key: "auto_create_suppliers", label: "Criar fornecedores automaticamente", desc: "Risco: cadastra fornecedor não validado", risk: true },
  { key: "auto_create_products", label: "Criar produtos automaticamente", desc: "Risco: cadastra produto sem revisão", risk: true },
];

export default function AutomationConfigPanel() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAutomationConfig().then(setConfig); }, []);

  if (!config) return <div className="h-24 animate-pulse rounded-xl bg-secondary" />;

  const toggle = (key) => setConfig((c) => ({ ...c, [key]: !c[key] }));
  const save = async () => {
    setSaving(true);
    try {
      await saveAutomationConfig({ ...config, updated_by: user?.full_name });
      await Core.audit({ audit_action: "update", module: "documentos", entity_type: "AutomationConfig", details: `Configuração de automação atualizada por ${user?.full_name}` });
      toast({ title: "Configuração salva", description: "O BARON agora opera com o novo nível de autonomia." });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  const autoCount = TOGGLES.filter((t) => !t.risk && config[t.key]).length;
  const riskCount = TOGGLES.filter((t) => t.risk && config[t.key]).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Nível de Autonomia do BARON</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-baron-success border-baron-success/30">
            <ShieldCheck className="h-3 w-3" /> {autoCount} automáticas
          </Badge>
          {riskCount > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
              <ShieldAlert className="h-3 w-3" /> {riskCount} de risco
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TOGGLES.map((t) => (
          <div key={t.key} className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 ${t.risk ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-secondary/30"}`}>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                {t.risk && <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />}
                {t.label}
              </p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </div>
            <Switch checked={config[t.key]} onCheckedChange={() => toggle(t.key)} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Mínimo para aprovação automática: <span className="font-medium text-foreground">{config.min_confidence_auto_approve}%</span>
        </p>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </div>
    </div>
  );
}