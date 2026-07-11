import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { GOAL_SCOPE_CONFIG, GOAL_STATUS_CONFIG, PRIORITY_CONFIG, formatBRL } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Target, Search } from "lucide-react";

const EMPTY = { name: '', description: '', scope_type: 'empresa', scope_name: '', responsible_name: '', indicator_name: '', expected_value: 0, actual_value: 0, unit: '%', deadline: '', priority: 'media' };

export default function GoalManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.Goal.list('-created_date', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) return;
    const progress = form.expected_value > 0 ? Math.min(100, Math.round((form.actual_value / form.expected_value) * 100)) : 0;
    await base44.entities.Goal.create({ ...form, progress_pct: progress, status: 'em_andamento', start_date: new Date().toISOString().split('T')[0] });
    setDialogOpen(false); setForm(EMPTY); load();
  };

  const handleUpdateProgress = async (id, actual) => {
    const goal = items.find(g => g.id === id);
    if (!goal) return;
    const progress = goal.expected_value > 0 ? Math.min(100, Math.round((actual / goal.expected_value) * 100)) : 0;
    await base44.entities.Goal.update(id, { actual_value: actual, progress_pct: progress, status: progress >= 100 ? 'concluida' : 'em_andamento' });
    load();
  };

  const filtered = items.filter(g => {
    if (scopeFilter !== 'all' && g.scope_type !== scopeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return g.name?.toLowerCase().includes(q) || g.responsible_name?.toLowerCase().includes(q) || g.scope_name?.toLowerCase().includes(q);
  });

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar meta..." className="pl-9" />
        </div>
        <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm">
          <option value="all">Todos os Escopos</option>
          {Object.entries(GOAL_SCOPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4" /> Nova Meta</Button>
      </div>

      <div className="space-y-2">
        {filtered.map((goal) => {
          const scCfg = GOAL_SCOPE_CONFIG[goal.scope_type] || {};
          const stCfg = GOAL_STATUS_CONFIG[goal.status] || {};
          const pCfg = PRIORITY_CONFIG[goal.priority] || {};
          const isUnitBRL = goal.unit === 'R$';
          return (
            <div key={goal.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50"><Target className="h-4 w-4 text-blue-500" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-neutral-800">{goal.name}</h4>
                    <span className={`rounded-full ${stCfg.bg} ${stCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{stCfg.label}</span>
                    <span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{pCfg.label}</span>
                    <span className="text-xs text-neutral-400">{scCfg.emoji} {scCfg.label}{goal.scope_name ? ': ' + goal.scope_name : ''}</span>
                  </div>
                  {goal.indicator_name && <p className="text-xs text-neutral-400 mt-0.5">Indicador: {goal.indicator_name}</p>}
                  {goal.responsible_name && <p className="text-xs text-neutral-400">Responsável: {goal.responsible_name}{goal.deadline ? ` · Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR')}` : ''}</p>}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">{isUnitBRL ? formatBRL(goal.actual_value) : goal.actual_value} / {isUnitBRL ? formatBRL(goal.expected_value) : `${goal.expected_value} ${goal.unit}`}</span>
                      <span className="font-medium text-neutral-700">{goal.progress_pct}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={`h-full rounded-full ${goal.progress_pct >= 100 ? 'bg-emerald-500' : goal.progress_pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${goal.progress_pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Input type="number" defaultValue={goal.actual_value} onBlur={(e) => handleUpdateProgress(goal.id, parseFloat(e.target.value) || 0)} className="w-24 h-8 text-xs" />
                  <span className="text-[10px] text-neutral-400">Atualizar</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Target className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhuma meta encontrada</p></div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Aumentar Receita Anual" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Escopo</Label><select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">{Object.entries(GOAL_SCOPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
              <div><Label>Nome do Escopo</Label><Input value={form.scope_name} onChange={(e) => setForm({ ...form, scope_name: e.target.value })} placeholder="Ex: Produção" /></div>
              <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
              <div><Label>Indicador</Label><Input value={form.indicator_name} onChange={(e) => setForm({ ...form, indicator_name: e.target.value })} placeholder="Ex: Receita" /></div>
              <div><Label>Valor Esperado</Label><Input type="number" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Valor Atual</Label><Input type="number" value={form.actual_value} onChange={(e) => setForm({ ...form, actual_value: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, R$, un" /></div>
              <div><Label>Prazo</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div><Label>Prioridade</Label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar Meta</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}