import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { PLAN_TYPE_CONFIG, PLAN_STATUS_CONFIG, formatBRL } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, GitCompare } from "lucide-react";

export default function PlanningManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', plan_type: 'anual', start_date: '', end_date: '', responsible_name: '', objectives: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.StrategicPlan.list('-created_date', 50)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) return;
    await base44.entities.StrategicPlan.create({
      ...form,
      objectives: form.objectives ? form.objectives.split('\n').filter(Boolean) : [],
      status: 'rascunho',
      plan_version: 1,
    });
    setDialogOpen(false);
    setForm({ name: '', description: '', plan_type: 'anual', start_date: '', end_date: '', responsible_name: '', objectives: '' });
    load();
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.StrategicPlan.update(id, { status, approved_by: status === 'aprovado' ? 'Diretoria' : undefined, approved_at: status === 'aprovado' ? new Date().toISOString() : undefined });
    load();
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4" /> Novo Planejamento</Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><FileText className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum planejamento criado</p></div>
      ) : (
        <div className="space-y-3">
          {items.map((plan) => {
            const tCfg = PLAN_TYPE_CONFIG[plan.plan_type] || {};
            const sCfg = PLAN_STATUS_CONFIG[plan.status] || {};
            return (
              <div key={plan.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-lg">{tCfg.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-neutral-800">{plan.name}</h3>
                      <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-2 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">v{plan.plan_version || 1}</span>
                    </div>
                    {plan.description && <p className="text-xs text-neutral-500 mt-0.5">{plan.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-400">
                      <span>{plan.start_date ? new Date(plan.start_date).toLocaleDateString('pt-BR') : '—'} → {plan.end_date ? new Date(plan.end_date).toLocaleDateString('pt-BR') : '—'}</span>
                      {plan.responsible_name && <span>· {plan.responsible_name}</span>}
                      {plan.approved_by && <span>· Aprovado por: {plan.approved_by}</span>}
                    </div>
                    {plan.objectives?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {plan.objectives.map((obj, i) => <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">{obj}</span>)}
                      </div>
                    )}
                  </div>
                  <select value={plan.status} onChange={(e) => handleStatusChange(plan.id, e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
                    {Object.entries(PLAN_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {plan.learnings && (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/30 p-2">
                    <p className="text-xs font-semibold text-amber-600">📋 Lições Aprendidas</p>
                    <p className="text-xs text-neutral-600 mt-0.5">{plan.learnings}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Planejamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Plano Estratégico 2026" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label><select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">{Object.entries(PLAN_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
              <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
              <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Objetivos (um por linha)</Label><Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={3} placeholder="Aumentar receita em 25%&#10;Reduzir CMV para 35%" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}