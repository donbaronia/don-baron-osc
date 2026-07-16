import React, { useEffect, useState, useCallback } from "react";
import { HCM, CAREER_LEVEL_CONFIG, REVIEW_CRITERIA } from "@/lib/hcmEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Star, TrendingUp, Award } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BaronSelect } from "@/design-system";

function ScoreBar({ label, value }) {
  const color = value >= 8 ? 'bg-emerald-500' : value >= 6 ? 'bg-blue-500' : value >= 4 ? 'bg-amber-500' : 'bg-red-500';
  return (<div><div className="flex justify-between text-xs"><span className="text-neutral-500">{label}</span><span className="font-medium text-neutral-700">{value || 0}</span></div><div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${(value || 0) * 10}%` }} /></div></div>);
}

export default function Performance({ refreshKey }) {
  const [reviews, setReviews] = useState([]);
  const [careerPlans, setCareerPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employee_id: '', review_date: new Date().toISOString().split('T')[0], period: '2026-H2', reviewer_name: '', scores: {}, comments: '', development_plan: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [r, c, e] = await Promise.all([HCM.listReviews(), HCM.listCareerPlans(), HCM.listEmployees()]); setReviews(r); setCareerPlans(c); setEmployees(e); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleScoreChange = (key, val) => { setForm({ ...form, scores: { ...form.scores, [key]: Number(val) } }); };

  const handleCreate = async () => {
    if (!form.employee_id) { toast({ title: "Selecione um colaborador", variant: "destructive" }); return; }
    setSaving(true);
    const emp = employees.find(e => e.id === form.employee_id);
    const scores = form.scores;
    const avg = Object.values(scores).length > 0 ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length : 0;
    try {
      await HCM.createReview({ ...form, employee_name: emp?.full_name || '', scores, average_score: Math.round(avg * 10) / 10, status: 'concluida' });
      toast({ title: "Avaliação registrada" });
      setForm({ employee_id: '', review_date: new Date().toISOString().split('T')[0], period: '2026-H2', reviewer_name: '', scores: {}, comments: '', development_plan: '' });
      load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };



  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Reviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Avaliações de Desempenho</h3>
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" />Nova Avaliação</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Avaliação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Colaborador</Label><BaronSelect value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} options={employees.filter((e) => e.status !== 'demitido' && e.status !== 'inativo').map((e) => ({ value: e.id, label: e.full_name }))} placeholder="Selecione..." /></div>
                  <div><Label className="text-xs">Período</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Ex: 2026-H2" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Data</Label><Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></div>
                  <div><Label className="text-xs">Avaliador</Label><Input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs mb-2 block">Critérios (0-10)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {REVIEW_CRITERIA.map(c => (
                      <div key={c.key} className="flex items-center gap-2">
                        <Label className="text-xs flex-1">{c.label}</Label>
                        <Input type="number" min="0" max="10" value={form.scores[c.key] || ''} onChange={(e) => handleScoreChange(c.key, e.target.value)} className="w-16" />
                      </div>
                    ))}
                  </div>
                </div>
                <div><Label className="text-xs">Comentários</Label><Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={2} /></div>
                <div><Label className="text-xs">Plano de Desenvolvimento</Label><Textarea value={form.development_plan} onChange={(e) => setForm({ ...form, development_plan: e.target.value })} rows={2} /></div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center"><Star className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-2 text-xs text-neutral-400">Nenhuma avaliação</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {reviews.map((r) => {
              const avg = r.average_score || 0;
              const color = avg >= 8 ? 'text-emerald-600 bg-emerald-50' : avg >= 6 ? 'text-blue-600 bg-blue-50' : avg >= 4 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
              return (
                <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-neutral-800">{r.employee_name}</h4>
                      <p className="text-xs text-neutral-400">{r.period} · {r.reviewer_name}</p>
                    </div>
                    <div className={`rounded-lg px-2 py-1 text-center ${color}`}>
                      <p className="text-lg font-bold leading-none">{avg.toFixed(1)}</p>
                      <p className="text-[8px] uppercase">média</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {REVIEW_CRITERIA.slice(0, 4).map(c => <ScoreBar key={c.key} label={c.label} value={r.scores?.[c.key]} />)}
                  </div>
                  {r.comments && <p className="mt-2 text-xs text-neutral-500 italic">"{r.comments}"</p>}
                  {r.development_plan && <p className="mt-1 text-xs text-blue-600">📋 {r.development_plan}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Career Plans */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Planos de Carreira</h3>
        {careerPlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center"><TrendingUp className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-2 text-xs text-neutral-400">Nenhum plano de carreira</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {careerPlans.map((cp) => {
              const cCfg = CAREER_LEVEL_CONFIG[cp.current_level] || {};
              const tCfg = CAREER_LEVEL_CONFIG[cp.target_level] || {};
              return (
                <div key={cp.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-neutral-800 flex-1">{cp.employee_name}</h4>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${cCfg.color}`}>{cCfg.emoji} {cCfg.label}</span>
                    <span className="text-neutral-300">→</span>
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${tCfg.color}`}>{tCfg.emoji} {tCfg.label}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs"><span className="text-neutral-500">Progresso</span><span className="font-medium text-neutral-700">{cp.progress_pct || 0}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${cp.progress_pct || 0}%` }} /></div>
                  </div>
                  {cp.requirements?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {cp.requirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`flex h-4 w-4 items-center justify-center rounded ${req.completed ? 'bg-emerald-500 text-white' : 'border border-neutral-300'}`}>{req.completed && '✓'}</span>
                          <span className={req.completed ? 'text-neutral-400 line-through' : 'text-neutral-600'}>{req.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {cp.target_promotion_date && <p className="mt-2 text-xs text-blue-600">🎯 Meta: {new Date(cp.target_promotion_date).toLocaleDateString('pt-BR')}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}