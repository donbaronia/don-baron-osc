import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/financial/FormField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Target, RefreshCw, Trash2 } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import DataTable from "@/components/shared/DataTable";
import Toolbar from "@/components/shared/Toolbar";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const EMPTY = { name: "", period_type: "monthly", max_cmv_pct: 30, target_margin_pct: 30, category: "", channel: "" };

export default function CMVReports() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [g, h] = await Promise.all([
      base44.entities.CMVGoal.filter({ active: true, deleted_at: null }, "name", 100).catch(() => []),
      CMV.getHistory(30).catch(() => []),
    ]);
    setGoals(g); setHistory(h);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY }); setDialog(true); };

  const handleSave = async () => {
    if (!form.name || form.max_cmv_pct === undefined) { toast({ title: "Erro", description: "Nome e CMV máx. são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await CMV.setGoal({ ...form, created_by_name: user?.full_name });
      toast({ title: "Meta criada!" });
      setDialog(false); load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const goalColumns = [
    { key: "name", label: "Nome", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "period_type", label: "Período", render: r => <span className="capitalize text-neutral-500">{r.period_type}</span> },
    { key: "max_cmv_pct", label: "CMV Máx.", render: r => <span className="font-medium text-rose-600">{r.max_cmv_pct}%</span> },
    { key: "target_margin_pct", label: "Margem Meta", render: r => <span className="font-medium text-emerald-600">{r.target_margin_pct}%</span> },
    { key: "category", label: "Categoria", render: r => r.category || "Todas" },
    { key: "channel", label: "Canal", render: r => r.channel || "Todos" },
  ];

  const historyColumns = [
    { key: "calculation_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.calculation_code}</span> },
    { key: "period_type", label: "Tipo", render: r => <span className="capitalize text-neutral-500">{r.period_type}</span> },
    { key: "period_date", label: "Período", render: r => r.period_date ? new Date(r.period_date).toLocaleDateString("pt-BR") : "—" },
    { key: "revenue_net", label: "Receita Líquida", render: r => brl(r.revenue_net) },
    { key: "cost_goods_sold", label: "CMV", render: r => brl(r.cost_goods_sold) },
    { key: "cmv_pct", label: "CMV %", render: r => <span className={r.cmv_pct > 35 ? "font-medium text-rose-600" : "text-neutral-700"}>{r.cmv_pct.toFixed(1)}%</span> },
    { key: "gross_profit", label: "Lucro Bruto", render: r => <span className="font-medium text-emerald-600">{brl(r.gross_profit)}</span> },
    { key: "margin_pct", label: "Margem", render: r => `${r.margin_pct.toFixed(1)}%` },
    { key: "calculated_at", label: "Calculado em", render: r => r.calculated_at ? new Date(r.calculated_at).toLocaleString("pt-BR") : "—" },
  ];

  const filteredHistory = history.filter(r => !search || (r.calculation_code || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Goals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-neutral-500" /><h3 className="text-base font-semibold text-neutral-900">Metas de CMV</h3></div>
          <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Meta</Button>
        </div>
        <DataTable columns={goalColumns} rows={goals} loading={loading} emptyTitle="Nenhuma meta" emptyDescription="Defina metas de CMV para monitorar." />
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">Histórico de Cálculos</h3>
          <button onClick={() => exportToCsv("cmv_historico.csv", filteredHistory)} className="text-sm text-neutral-500 hover:text-neutral-700">Exportar CSV</button>
        </div>
        <Toolbar search={search} onSearch={setSearch}>
          <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        </Toolbar>
        <DataTable columns={historyColumns} rows={filteredHistory} loading={loading} emptyTitle="Nenhum cálculo" emptyDescription="Os cálculos de CMV aparecerão aqui." />
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Meta de CMV</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Nome *" className="col-span-2"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: CMV Mensal Geral" /></FormField>
            <FormField label="Período"><select className={SEL} value={form.period_type} onChange={e => setForm({ ...form, period_type: e.target.value })}><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option><option value="annual">Anual</option></select></FormField>
            <FormField label="CMV Máximo (%)"><Input type="number" step="0.1" value={form.max_cmv_pct} onChange={e => setForm({ ...form, max_cmv_pct: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Margem Meta (%)"><Input type="number" step="0.1" value={form.target_margin_pct} onChange={e => setForm({ ...form, target_margin_pct: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Categoria (vazio = todas)"><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></FormField>
            <FormField label="Canal (vazio = todos)" className="col-span-2"><Input value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} /></FormField>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}