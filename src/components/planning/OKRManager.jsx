import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { OKR_STATUS_CONFIG } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Target } from "lucide-react";

const EMPTY = { objective: '', description: '', responsible_name: '', period: '', start_date: '', end_date: '', key_results: '' };

export default function OKRManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.OKR.list('-created_date', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.objective) return;
    const krs = form.key_results ? form.key_results.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|');
      return { description: parts[0]?.trim() || '', target: parseFloat(parts[1]) || 0, current: parseFloat(parts[2]) || 0, unit: parts[3]?.trim() || '', progress: parts[1] && parts[2] ? Math.min(100, Math.round((parseFloat(parts[2]) / parseFloat(parts[1])) * 100)) : 0 };
    }) : [];
    const overall = krs.length > 0 ? Math.round(krs.reduce((s, kr) => s + (kr.progress || 0), 0) / krs.length) : 0;
    await base44.entities.OKR.create({ ...form, key_results: krs, overall_progress: overall, status: 'em_andamento' });
    setDialogOpen(false); setForm(EMPTY); load();
  };

  const handleUpdateKR = async (okrId, krIndex, current) => {
    const okr = items.find(o => o.id === okrId);
    if (!okr || !okr.key_results) return;
    const krs = [...okr.key_results];
    const kr = { ...krs[krIndex] };
    kr.current = parseFloat(current) || 0;
    kr.progress = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
    krs[krIndex] = kr;
    const overall = krs.length > 0 ? Math.round(krs.reduce((s, k) => s + (k.progress || 0), 0) / krs.length) : 0;
    await base44.entities.OKR.update(okrId, { key_results: krs, overall_progress: overall });
    load();
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4" /> Novo OKR</Button></div>

      <div className="space-y-3">
        {items.map((okr) => {
          const sCfg = OKR_STATUS_CONFIG[okr.status] || {};
          return (
            <div key={okr.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><Target className="h-5 w-5 text-blue-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-neutral-800">{okr.objective}</h3>
                    <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                    {okr.period && <span className="text-xs text-neutral-400">{okr.period}</span>}
                  </div>
                  {okr.description && <p className="text-xs text-neutral-500 mt-0.5">{okr.description}</p>}
                  {okr.responsible_name && <p className="text-xs text-neutral-400 mt-0.5">Responsável: {okr.responsible_name}</p>}

                  {/* Overall progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs"><span className="text-neutral-500">Progresso Geral</span><span className="font-bold text-neutral-700">{okr.overall_progress}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full ${okr.overall_progress >= 70 ? 'bg-emerald-500' : okr.overall_progress >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${okr.overall_progress}%` }} /></div>
                  </div>

                  {/* Key Results */}
                  {okr.key_results?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-neutral-500 uppercase">Key Results</p>
                      {okr.key_results.map((kr, i) => (
                        <div key={i} className="rounded-lg border border-neutral-100 p-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-600">{kr.description}</span>
                            <span className="font-medium text-neutral-700">{kr.current} / {kr.target} {kr.unit}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full bg-blue-400" style={{ width: `${kr.progress || 0}%` }} /></div>
                          <div className="mt-1 flex items-center gap-1">
                            <Input type="number" defaultValue={kr.current} onBlur={(e) => handleUpdateKR(okr.id, i, e.target.value)} className="h-6 w-20 text-xs" placeholder="Atualizar" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {items.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Target className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum OKR cadastrado</p></div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo OKR</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Objetivo *</Label><Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Ex: Tornar-se a maior rede da região" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
              <div><Label>Período</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-Q3" /></div>
              <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Key Results (um por linha, formato: descrição | meta | atual | unidade)</Label>
              <Textarea value={form.key_results} onChange={(e) => setForm({ ...form, key_results: e.target.value })} rows={3} placeholder="Abrir 2 novas unidades | 2 | 1 | un&#10;Aumentar receita 40% | 40 | 25 | %" />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}