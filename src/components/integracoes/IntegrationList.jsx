import React, { useEffect, useState, useCallback } from "react";
import { IntegrationHub, INTEGRATION_ICONS, CATEGORY_LABELS, STATUS_CONFIG } from "@/lib/integrationHub";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Play, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function IntegrationList({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [form, setForm] = useState({
    name: "",
    integration_type: "",
    category: "",
    direction: "both",
    status: "sandbox",
    sandbox_mode: true,
    base_url: "",
    auth_type: "api_key",
    requests_per_min: 60,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await IntegrationHub.listIntegrations();
      setItems(res.items || []);
      setCatalog(res.catalog || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCreate = async () => {
    if (!form.name || !form.integration_type) {
      toast({ title: "Preencha nome e tipo", variant: "destructive" });
      return;
    }
    try {
      await IntegrationHub.createIntegration({
        name: form.name,
        integration_type: form.integration_type,
        category: form.category || "custom",
        direction: form.direction,
        status: form.status,
        sandbox_mode: form.sandbox_mode,
        provider_config: {
          base_url: form.base_url,
          auth_type: form.auth_type,
        },
        rate_limit: {
          requests_per_min: Number(form.requests_per_min) || 60,
          requests_per_hour: 1000,
          requests_per_day: 10000,
        },
      });
      toast({ title: "Integração criada" });
      setDialogOpen(false);
      setForm({ name: "", integration_type: "", category: "", direction: "both", status: "sandbox", sandbox_mode: true, base_url: "", auth_type: "api_key", requests_per_min: 60 });
      load();
    } catch (e) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    }
  };

  const handleTest = async (id) => {
    setTestResults(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      const res = await IntegrationHub.testIntegration(id);
      setTestResults(prev => ({ ...prev, [id]: res.test }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, error: e.message } }));
    }
  };

  const handleDelete = async (id) => {
    try {
      await IntegrationHub.deleteIntegration(id);
      toast({ title: "Integração removida" });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      await IntegrationHub.updateIntegration(item.id, { status: newStatus });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} integração(ões) configurada(s)</p>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Nova Integração
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <p className="text-sm text-neutral-400">Nenhuma integração configurada ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pendente;
            const test = testResults[item.id];
            return (
              <div key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{INTEGRATION_ICONS[item.integration_type] || "🔌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-neutral-800 truncate">{item.name}</h4>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {CATEGORY_LABELS[item.category] || item.category} · {item.direction} · {item.total_calls || 0} chamadas
                    </p>
                    {item.webhook_url && (
                      <p className="text-xs text-blue-500 mt-1 truncate">🔗 {item.webhook_url}</p>
                    )}
                    {test && (
                      <div className={`mt-2 rounded-lg p-2 text-xs ${test.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {test.loading ? "Testando..." : test.success ? `✅ ${test.response?.status} · ${test.duration_ms}ms` : `❌ ${test.error}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleTest(item.id)} disabled={test?.loading}>
                    <Play className="h-3.5 w-3.5" /> Testar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(item)}>
                    <Zap className="h-3.5 w-3.5" /> {item.status === 'ativo' ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 ml-auto" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Integração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: iFood Produção" />
            </div>
            <div>
              <Label>Tipo de Integração</Label>
              <Select value={form.integration_type} onValueChange={(v) => {
                const cat = catalog.find(c => c.type === v);
                setForm({ ...form, integration_type: v, category: cat?.category || "", base_url: cat?.base_url || form.base_url, name: form.name || cat?.name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {catalog.map((c) => (
                    <SelectItem key={c.type} value={c.type}>
                      {INTEGRATION_ICONS[c.type]} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Direção</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Bidirecional</SelectItem>
                    <SelectItem value="inbound">Entrada</SelectItem>
                    <SelectItem value="outbound">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Inicial</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>URL Base</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.exemplo.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Auth</Label>
                <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oauth2">OAuth2</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="bearer_token">Bearer Token</SelectItem>
                    <SelectItem value="basic_auth">Basic Auth</SelectItem>
                    <SelectItem value="none">Nenhuma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Req/min</Label>
                <Input type="number" value={form.requests_per_min} onChange={(e) => setForm({ ...form, requests_per_min: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.sandbox_mode} onCheckedChange={(v) => setForm({ ...form, sandbox_mode: v })} />
              <Label className="cursor-pointer">Modo Sandbox (testes antes de produção)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Integração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}