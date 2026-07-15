import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PE, brl, todayStr } from "@/lib/productionEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Play, Pause, Check, Ban, RefreshCw, Clock } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

import { BaronSelect } from "@/design-system";

const CENTERS = ["blend", "molhos", "batata", "bacon", "cebola_crispy", "sobremesas", "bebidas", "pre_preparo", "limpeza", "outros"];

const EMPTY = { recipe_id: "", recipe_name: "", item: "", production_center: "blend", planned_quantity: 0, unit: "un", priority: "media", expected_time_min: 0, team: "", notes: "" };

export default function ProductionOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [finalizeDialog, setFinalizeDialog] = useState(null);
  const [finalizeForm, setFinalizeForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [prods, recs] = await Promise.all([
        base44.entities.ProductionRecord.filter({ deleted_at: null }, "-production_date", 300).catch(() => []),
        base44.entities.Recipe.filter({ active: true }, "name", 500).catch(() => []),
      ]);
      setRows(prods); setRecipes(recs);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => (tab === "todos" || r.status === tab) && (!search || (r.item || "").toLowerCase().includes(search.toLowerCase()) || (r.production_code || "").toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => { setForm({ ...EMPTY, production_date: todayStr() }); setDialog(true); };

  const handleCreate = async () => {
    if (!form.item || !form.planned_quantity) { toast({ title: "Erro", description: "Item e quantidade são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const recipe = recipes.find(r => r.id === form.recipe_id);
      await PE.createProductionOrder({
        ...form,
        recipe_name: recipe?.name,
        product_id: recipe?.product_id,
        team: form.team ? form.team.split(",").map(t => t.trim()).filter(Boolean) : [],
        responsible: user?.full_name || "Sistema",
        production_date: form.production_date || todayStr(),
      });
      toast({ title: "Ordem criada!" });
      setDialog(false); load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const changeStatus = async (r, status, extra = {}) => {
    try {
      await PE.updateStatus(r.id, status, { ...extra, responsible: user?.full_name });
      toast({ title: `Status: ${status}` });
      load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const openFinalize = (r) => {
    setFinalizeForm({ produced_quantity: r.planned_quantity, lost_quantity: 0, reused_quantity: 0, loss_type: "", loss_reason: "", yield_reason: "", notes: "", quality_checklist: { temperature: "", weight: "", appearance: true, texture: true, flavor: true, standardization: true, notes: "", approved: false } });
    setFinalizeDialog(r);
  };

  const handleFinalize = async () => {
    setSaving(true);
    try {
      await PE.finalizeProduction(finalizeDialog.id, { ...finalizeForm, responsible: user?.full_name });
      toast({ title: "Produção concluída!", description: "Estoque baixado automaticamente" });
      setFinalizeDialog(null); load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const columns = [
    { key: "production_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.production_code}</span> },
    { key: "item", label: "Item", render: r => <span className="font-medium text-neutral-900">{r.item}</span> },
    { key: "production_center", label: "Centro", render: r => <span className="text-xs capitalize text-neutral-500">{(r.production_center || "geral").replace(/_/g, " ")}</span> },
    { key: "planned_quantity", label: "Planejado", render: r => `${r.planned_quantity} ${r.unit || ""}` },
    { key: "produced_quantity", label: "Produzido", render: r => r.produced_quantity > 0 ? <span className="text-emerald-600 font-medium">{r.produced_quantity}</span> : "—" },
    { key: "efficiency_pct", label: "Efic.", render: r => r.efficiency_pct ? `${r.efficiency_pct.toFixed(0)}%` : "—" },
    { key: "responsible", label: "Responsável" },
    { key: "production_date", label: "Data", render: r => r.production_date ? new Date(r.production_date).toLocaleDateString("pt-BR") : "—" },
    { key: "priority", label: "Prioridade", render: r => <StatusBadge status={r.priority} /> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status === "planejada" && <Button variant="ghost" size="icon" onClick={() => changeStatus(r, "liberada")} title="Liberar"><Check className="h-4 w-4 text-blue-600" /></Button>}
        {r.status === "liberada" && <Button variant="ghost" size="icon" onClick={() => changeStatus(r, "em_producao")} title="Iniciar"><Play className="h-4 w-4 text-emerald-600" /></Button>}
        {r.status === "em_producao" && <Button variant="ghost" size="icon" onClick={() => changeStatus(r, "pausada")} title="Pausar"><Pause className="h-4 w-4 text-amber-600" /></Button>}
        {r.status === "pausada" && <Button variant="ghost" size="icon" onClick={() => changeStatus(r, "em_producao")} title="Retomar"><Play className="h-4 w-4 text-emerald-600" /></Button>}
        {(r.status === "em_producao" || r.status === "pausada") && <Button variant="ghost" size="icon" onClick={() => openFinalize(r)} title="Finalizar"><Check className="h-4 w-4 text-emerald-700" /></Button>}
        {!["concluida", "cancelada", "reprovada"].includes(r.status) && <Button variant="ghost" size="icon" onClick={() => changeStatus(r, "cancelada")} title="Cancelar"><Ban className="h-4 w-4 text-rose-600" /></Button>}
      </div>
    ) },
  ];

  const LOSS_TYPES = [{ v: "queima", l: "Queima" }, { v: "erro_preparo", l: "Erro de Preparo" }, { v: "vencimento", l: "Vencimento" }, { v: "manipulacao", l: "Manipulação" }, { v: "queda", l: "Queda" }, { v: "contaminacao", l: "Contaminação" }, { v: "sobras", l: "Sobras" }, { v: "treinamento", l: "Treinamento" }, { v: "outros", l: "Outros" }];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("producoes.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Ordem</Button>
      </Toolbar>
      <div className="flex gap-2 flex-wrap">
        {[{ v: "todos", l: "Todos" }, { v: "planejada", l: "Planejadas" }, { v: "liberada", l: "Liberadas" }, { v: "em_producao", l: "Em Produção" }, { v: "pausada", l: "Pausadas" }, { v: "concluida", l: "Concluídas" }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
        ))}
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma produção" emptyDescription="Crie uma ordem de produção para começar." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Ordem de Produção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Receita" className="col-span-2">
              <BaronSelect
                value={form.recipe_id}
                onChange={(v) => { const r = recipes.find((x) => x.id === v); setForm({ ...form, recipe_id: v, recipe_name: r?.name, item: r?.product_name || r?.name || form.item, unit: r?.yield_unit || form.unit, production_center: r?.production_center || form.production_center, expected_time_min: r?.preparation_time || 0 }); }}
                options={recipes.map((r) => ({ value: r.id, label: r.name }))}
                placeholder="Selecione..."
              />
            </FormField>
            <FormField label="Item *" className="col-span-2"><Input value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></FormField>
            <FormField label="Centro de Produção"><BaronSelect value={form.production_center} onChange={(v) => setForm({ ...form, production_center: v })} options={CENTERS.map((c) => ({ value: c, label: c.replace(/_/g, " ") }))} /></FormField>
            <FormField label="Prioridade"><BaronSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={[{ value: "baixa", label: "Baixa" }, { value: "media", label: "Média" }, { value: "alta", label: "Alta" }, { value: "critica", label: "Crítica" }]} /></FormField>
            <FormField label="Qtd. Planejada *"><Input type="number" step="0.01" value={form.planned_quantity} onChange={e => setForm({ ...form, planned_quantity: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Unidade"><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></FormField>
            <FormField label="Tempo Previsto (min)"><Input type="number" value={form.expected_time_min} onChange={e => setForm({ ...form, expected_time_min: parseInt(e.target.value) || 0 })} /></FormField>
            <FormField label="Data"><Input type="date" value={form.production_date || todayStr()} onChange={e => setForm({ ...form, production_date: e.target.value })} /></FormField>
            <FormField label="Equipe (separar por vírgula)" className="col-span-2"><Input value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} placeholder="João, Maria, Pedro" /></FormField>
            <FormField label="Observações" className="col-span-2"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></FormField>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Criando..." : "Criar Ordem"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!finalizeDialog} onOpenChange={(o) => !o && setFinalizeDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Finalizar Produção — {finalizeDialog?.production_code}</DialogTitle></DialogHeader>
          {finalizeDialog && (
            <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="col-span-2 rounded-lg bg-neutral-50 p-3 text-sm">
                <span className="text-neutral-500">Item: </span><span className="font-medium text-neutral-900">{finalizeDialog.item}</span>
                <span className="ml-3 text-neutral-500">Planejado: </span><span className="font-medium">{finalizeDialog.planned_quantity} {finalizeDialog.unit}</span>
              </div>
              <FormField label="Qtd. Produzida *"><Input type="number" step="0.01" value={finalizeForm.produced_quantity} onChange={e => setFinalizeForm({ ...finalizeForm, produced_quantity: parseFloat(e.target.value) || 0 })} /></FormField>
              <FormField label="Qtd. Perdida"><Input type="number" step="0.01" value={finalizeForm.lost_quantity} onChange={e => setFinalizeForm({ ...finalizeForm, lost_quantity: parseFloat(e.target.value) || 0 })} /></FormField>
              <FormField label="Qtd. Reaproveitada"><Input type="number" step="0.01" value={finalizeForm.reused_quantity} onChange={e => setFinalizeForm({ ...finalizeForm, reused_quantity: parseFloat(e.target.value) || 0 })} /></FormField>
              <FormField label="Motivo Rendimento"><Input value={finalizeForm.yield_reason} onChange={e => setFinalizeForm({ ...finalizeForm, yield_reason: e.target.value })} /></FormField>
              {finalizeForm.lost_quantity > 0 && (
                <>
                  <FormField label="Tipo de Perda" className="col-span-2"><BaronSelect value={finalizeForm.loss_type} onChange={(v) => setFinalizeForm({ ...finalizeForm, loss_type: v })} options={LOSS_TYPES.map((l) => ({ value: l.v, label: l.l }))} placeholder="Selecione..." /></FormField>
                  <FormField label="Motivo da Perda" className="col-span-2"><Input value={finalizeForm.loss_reason} onChange={e => setFinalizeForm({ ...finalizeForm, loss_reason: e.target.value })} /></FormField>
                </>
              )}
              <div className="col-span-2 border-t pt-2">
                <p className="text-xs font-semibold text-neutral-500 mb-2">CHECKLIST DE QUALIDADE</p>
                {["appearance", "texture", "flavor", "standardization"].map(q => (
                  <label key={q} className="flex items-center gap-2 py-1 text-sm capitalize">
                    <input type="checkbox" checked={finalizeForm.quality_checklist?.[q]} onChange={e => setFinalizeForm({ ...finalizeForm, quality_checklist: { ...finalizeForm.quality_checklist, [q]: e.target.checked } })} />
                    {q.replace(/_/g, " ")}
                  </label>
                ))}
                <FormField label="Temperatura"><Input value={finalizeForm.quality_checklist?.temperature || ""} onChange={e => setFinalizeForm({ ...finalizeForm, quality_checklist: { ...finalizeForm.quality_checklist, temperature: e.target.value } })} /></FormField>
                <FormField label="Peso"><Input value={finalizeForm.quality_checklist?.weight || ""} onChange={e => setFinalizeForm({ ...finalizeForm, quality_checklist: { ...finalizeForm.quality_checklist, weight: e.target.value } })} /></FormField>
                <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={finalizeForm.quality_checklist?.approved} onChange={e => setFinalizeForm({ ...finalizeForm, quality_checklist: { ...finalizeForm.quality_checklist, approved: e.target.checked } })} />Aprovar qualidade</label>
              </div>
              <FormField label="Observações" className="col-span-2"><Textarea value={finalizeForm.notes} onChange={e => setFinalizeForm({ ...finalizeForm, notes: e.target.value })} rows={2} /></FormField>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialog(null)}>Cancelar</Button>
            <Button onClick={handleFinalize} disabled={saving} className="gap-2"><Check className="h-4 w-4" /> {saving ? "Processando..." : "Concluir e Baixar Estoque"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}