import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { BUDGET_TYPE_CONFIG, BUDGET_STATUS_CONFIG, formatBRL } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Wallet, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { BaronSelect } from "@/design-system";

const EMPTY = { name: '', description: '', budget_type: 'despesa', category: '', expected_amount: 0, actual_amount: 0, period: '', responsible_name: '', justification: '' };

export default function BudgetManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.BudgetItem.list('-created_date', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) return;
    const variance = (form.actual_amount || 0) - (form.expected_amount || 0);
    const variance_pct = form.expected_amount > 0 ? Math.round((variance / form.expected_amount) * 100) : 0;
    const status = form.actual_amount > 0 && Math.abs(variance_pct) > 10 ? 'desviado' : form.actual_amount > 0 ? 'realizado' : 'previsto';
    await base44.entities.BudgetItem.create({ ...form, variance, variance_pct, status });
    setDialogOpen(false); setForm(EMPTY); load();
  };

  const filtered = typeFilter === 'all' ? items : items.filter(i => i.budget_type === typeFilter);

  const totalExpected = items.reduce((s, i) => s + (i.expected_amount || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const totalVariance = totalActual - totalExpected;

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Previsto</p><p className="text-lg font-bold text-neutral-800">{formatBRL(totalExpected)}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Realizado</p><p className="text-lg font-bold text-neutral-800">{formatBRL(totalActual)}</p></div>
        <div className={`rounded-xl border p-4 ${totalVariance > 0 ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
          <p className="text-xs text-neutral-400">Desvio Total</p>
          <p className={`text-lg font-bold ${totalVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{totalVariance > 0 ? '+' : ''}{formatBRL(totalVariance)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="w-48"><BaronSelect value={typeFilter} onChange={(v) => setTypeFilter(v)} options={Object.entries(BUDGET_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))} placeholder="Todos os Tipos" /></div>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4" /> Novo Item</Button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left p-3 font-medium text-neutral-500">Item</th>
                <th className="text-center p-3 font-medium text-neutral-500">Tipo</th>
                <th className="text-right p-3 font-medium text-neutral-500">Previsto</th>
                <th className="text-right p-3 font-medium text-neutral-500">Realizado</th>
                <th className="text-right p-3 font-medium text-neutral-500">Desvio</th>
                <th className="text-center p-3 font-medium text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const tCfg = BUDGET_TYPE_CONFIG[item.budget_type] || {};
                const sCfg = BUDGET_STATUS_CONFIG[item.status] || {};
                const hasDeviation = Math.abs(item.variance_pct || 0) > 10;
                return (
                  <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="p-3"><p className="font-medium text-neutral-700">{item.name}</p>{item.responsible_name && <p className="text-xs text-neutral-400">{item.responsible_name} · {item.period || ''}</p>}{hasDeviation && item.justification && <p className="text-xs text-red-400 italic mt-0.5">⚠ {item.justification}</p>}</td>
                    <td className="p-3 text-center"><span className={`rounded-full ${tCfg.bg} ${tCfg.color} px-2 py-0.5 text-[10px] font-medium`}>{tCfg.emoji} {tCfg.label}</span></td>
                    <td className="p-3 text-right text-neutral-600">{formatBRL(item.expected_amount)}</td>
                    <td className="p-3 text-right text-neutral-600">{formatBRL(item.actual_amount)}</td>
                    <td className={`p-3 text-right font-medium ${hasDeviation ? 'text-red-600' : 'text-emerald-600'}`}>
                      {item.variance_pct > 0 ? '+' : ''}{item.variance_pct || 0}%
                      {item.variance_pct > 0 ? <TrendingUp className="inline h-3 w-3 ml-1 text-red-400" /> : <TrendingDown className="inline h-3 w-3 ml-1 text-emerald-400" />}
                    </td>
                    <td className="p-3 text-center"><span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-2 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Wallet className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum item de orçamento</p></div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Item de Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label><BaronSelect value={form.budget_type} onChange={(v) => setForm({ ...form, budget_type: v })} options={Object.entries(BUDGET_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))} /></div>
              <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Previsto (R$)</Label><Input type="number" value={form.expected_amount} onChange={(e) => setForm({ ...form, expected_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Realizado (R$)</Label><Input type="number" value={form.actual_amount} onChange={(e) => setForm({ ...form, actual_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Período</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-07 ou 2026-Q3" /></div>
              <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
            </div>
            <div><Label>Justificativa (se desvio)</Label><Textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}