import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { PROJECT_TYPE_CONFIG, PROJECT_STATUS_CONFIG, PRIORITY_CONFIG, formatBRL } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Rocket } from "lucide-react";
import { BaronSelect } from "@/design-system";

const EMPTY = { name: '', description: '', project_type: 'outros', responsible_name: '', team: '', start_date: '', end_date: '', investment_amount: 0, expected_return: 0, priority: 'media' };

export default function ProjectManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.StrategicProject.list('-created_date', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) return;
    const roi = form.investment_amount > 0 ? Math.round(((form.expected_return - form.investment_amount) / form.investment_amount) * 100) : 0;
    const payback = form.expected_return > 0 ? Math.round((form.investment_amount / (form.expected_return / 12))) : 0;
    await base44.entities.StrategicProject.create({
      ...form, team: form.team ? form.team.split(',').map(t => t.trim()).filter(Boolean) : [],
      roi_pct: roi, payback_months: payback, status: 'planejado', progress_pct: 0,
    });
    setDialogOpen(false); setForm(EMPTY); load();
  };

  const handleProgress = async (id, progress) => {
    const project = items.find(p => p.id === id);
    await base44.entities.StrategicProject.update(id, { progress_pct: progress, status: progress >= 100 ? 'concluido' : 'em_andamento' });
    load();
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  const totalInvestment = items.reduce((s, p) => s + (p.investment_amount || 0), 0);
  const totalReturn = items.reduce((s, p) => s + (p.expected_return || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Projetos</p><p className="text-lg font-bold text-neutral-800">{items.length}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Investimento Total</p><p className="text-lg font-bold text-neutral-800">{formatBRL(totalInvestment)}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Retorno Esperado</p><p className="text-lg font-bold text-emerald-600">{formatBRL(totalReturn)}</p></div>
      </div>

      <div className="flex justify-end"><Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4" /> Novo Projeto</Button></div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((project) => {
          const tCfg = PROJECT_TYPE_CONFIG[project.project_type] || {};
          const sCfg = PROJECT_STATUS_CONFIG[project.status] || {};
          const pCfg = PRIORITY_CONFIG[project.priority] || {};
          return (
            <div key={project.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-lg">{tCfg.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-neutral-800">{project.name}</h4>
                    <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                    <span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{pCfg.label}</span>
                  </div>
                  {project.description && <p className="text-xs text-neutral-500 mt-0.5">{project.description}</p>}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-neutral-400">Investimento</p><p className="font-medium text-neutral-700">{formatBRL(project.investment_amount)}</p></div>
                    <div><p className="text-neutral-400">Retorno</p><p className="font-medium text-emerald-600">{formatBRL(project.expected_return)}</p></div>
                    <div><p className="text-neutral-400">ROI / Payback</p><p className="font-medium text-blue-600">{project.roi_pct}% · {project.payback_months}m</p></div>
                  </div>
                  {project.team?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{project.team.map((t, i) => <span key={i} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">{t}</span>)}</div>}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs"><span className="text-neutral-500">Progresso</span><span className="font-medium text-neutral-700">{project.progress_pct}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full ${project.progress_pct >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${project.progress_pct}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input type="range" min="0" max="100" defaultValue={project.progress_pct} onChange={(e) => handleProgress(project.id, parseInt(e.target.value))} className="flex-1 h-1" />
              </div>
            </div>
          );
        })}
      </div>
      {items.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Rocket className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum projeto cadastrado</p></div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Projeto Estratégico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label><BaronSelect value={form.project_type} onChange={(v) => setForm({ ...form, project_type: v })} options={Object.entries(PROJECT_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))} /></div>
              <div><Label>Prioridade</Label><BaronSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
              <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
              <div><Label>Equipe (vírgula)</Label><Input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} placeholder="TI, Operações" /></div>
              <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div><Label>Investimento (R$)</Label><Input type="number" value={form.investment_amount} onChange={(e) => setForm({ ...form, investment_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Retorno Esperado (R$)</Label><Input type="number" value={form.expected_return} onChange={(e) => setForm({ ...form, expected_return: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}