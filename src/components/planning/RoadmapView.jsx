import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { EnterprisePlanning, ROADMAP_TYPE_CONFIG, ROADMAP_STATUS_CONFIG } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Map, Loader2, Brain, AlertTriangle, Shield } from "lucide-react";
import { BaronSelect } from "@/design-system";

const YEARS = [2026, 2027, 2028, 2029, 2030];
const EMPTY = { title: '', description: '', year: 2026, quarter: 'anual', item_type: 'meta', responsible_name: '' };

export default function RoadmapView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.RoadmapItem.list('year', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title) return;
    await base44.entities.RoadmapItem.create({ ...form, status: 'planejado' });
    setDialogOpen(false); setForm(EMPTY); load();
  };

  const handleRisk = async () => {
    setAnalyzing(true);
    try { setRiskAnalysis(await EnterprisePlanning.aiRiskAnalysis()); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4" /> Novo Item</Button>
        <Button onClick={handleRisk} size="sm" disabled={analyzing}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {analyzing ? "Analisando..." : "Análise de Riscos IA"}
        </Button>
      </div>

      {/* Risk Analysis */}
      {riskAnalysis?.analysis && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 mb-3"><AlertTriangle className="h-4 w-4 text-purple-600" /> Análise de Riscos Estratégicos</h3>
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">{riskAnalysis.analysis.risk_overview}</p>
            {riskAnalysis.analysis.critical_risks?.length > 0 && <div><p className="text-xs font-semibold text-red-600 uppercase mb-1">⚠ Riscos Críticos</p><ul className="space-y-1">{riskAnalysis.analysis.critical_risks.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-red-400">•</span>{r}</li>)}</ul></div>}
            {riskAnalysis.analysis.project_risks?.length > 0 && <div><p className="text-xs font-semibold text-amber-600 uppercase mb-1">📋 Riscos por Projeto</p><ul className="space-y-1">{riskAnalysis.analysis.project_risks.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-amber-400">•</span>{r}</li>)}</ul></div>}
            {riskAnalysis.analysis.budget_risks?.length > 0 && <div><p className="text-xs font-semibold text-orange-600 uppercase mb-1">💰 Riscos Orçamentários</p><ul className="space-y-1">{riskAnalysis.analysis.budget_risks.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-orange-400">•</span>{r}</li>)}</ul></div>}
            {riskAnalysis.analysis.mitigation_actions?.length > 0 && <div><p className="text-xs font-semibold text-emerald-600 uppercase mb-1">✓ Ações de Mitigação</p><ul className="space-y-1">{riskAnalysis.analysis.mitigation_actions.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-emerald-400">→</span>{r}</li>)}</ul></div>}
            {riskAnalysis.analysis.monitoring_points?.length > 0 && <div><p className="text-xs font-semibold text-blue-600 uppercase mb-1">📊 Pontos de Monitoramento</p><ul className="space-y-1">{riskAnalysis.analysis.monitoring_points.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-blue-400">•</span>{r}</li>)}</ul></div>}
          </div>
        </div>
      )}

      {/* Roadmap Timeline */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Map className="h-4 w-4" /> Roadmap Estratégico</h3>
        <div className="space-y-4">
          {YEARS.map((year) => {
            const yearItems = items.filter(i => i.year === year);
            return (
              <div key={year} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 text-white text-sm font-bold">{year}</div>
                  {year !== YEARS[YEARS.length - 1] && <div className="w-0.5 flex-1 bg-neutral-200 mt-2" style={{ minHeight: '40px' }} />}
                </div>
                <div className="flex-1 pb-4">
                  {yearItems.length === 0 ? (
                    <p className="text-xs text-neutral-300 py-4">Sem itens planejados</p>
                  ) : (
                    <div className="space-y-2">
                      {yearItems.map((item) => {
                        const tCfg = ROADMAP_TYPE_CONFIG[item.item_type] || {};
                        const sCfg = ROADMAP_STATUS_CONFIG[item.status] || {};
                        return (
                          <div key={item.id} className="rounded-xl border border-neutral-100 p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{tCfg.emoji}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-neutral-700">{item.title}</h4>
                                  <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{item.quarter}</span>
                                </div>
                                {item.description && <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>}
                                {item.responsible_name && <p className="text-xs text-neutral-400">👤 {item.responsible_name}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Item do Roadmap</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Ano</Label><BaronSelect value={String(form.year)} onChange={(v) => setForm({ ...form, year: parseInt(v) })} options={YEARS.map((y) => ({ value: String(y), label: String(y) }))} /></div>
              <div><Label>Trimestre</Label><BaronSelect value={form.quarter} onChange={(v) => setForm({ ...form, quarter: v })} options={[{ value: "Q1", label: "Q1" }, { value: "Q2", label: "Q2" }, { value: "Q3", label: "Q3" }, { value: "Q4", label: "Q4" }, { value: "anual", label: "Anual" }]} /></div>
              <div><Label>Tipo</Label><BaronSelect value={form.item_type} onChange={(v) => setForm({ ...form, item_type: v })} options={Object.entries(ROADMAP_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))} /></div>
            </div>
            <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}