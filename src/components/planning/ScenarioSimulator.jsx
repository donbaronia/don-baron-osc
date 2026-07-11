import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { EnterprisePlanning, SCENARIO_TYPE_CONFIG, SCENARIO_STATUS_CONFIG, formatBRL } from "@/lib/enterprisePlanning";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GitCompare, Brain, Loader2, AlertCircle } from "lucide-react";

const EMPTY = { name: '', description: '', scenario_type: 'preco', assumptions: '', variables: '', baseline_metrics: '', projected_metrics: '', impact_summary: '' };

export default function ScenarioSimulator() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await base44.entities.Scenario.list('-created_date', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) return;
    const tryParse = (s) => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };
    await base44.entities.Scenario.create({
      ...form,
      variables: tryParse(form.variables),
      baseline_metrics: tryParse(form.baseline_metrics),
      projected_metrics: tryParse(form.projected_metrics),
      status: 'rascunho',
    });
    setDialogOpen(false); setForm(EMPTY); load();
  };

  const handleSimulate = async (id) => {
    await base44.entities.Scenario.update(id, { status: 'simulado' });
    load();
  };

  const handleCompare = async () => {
    setComparing(true);
    try { setComparison(await EnterprisePlanning.aiCompareScenarios(selectedIds)); }
    catch (e) { console.error(e); }
    finally { setComparing(false); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-600">Os resultados das simulações são <strong>estimativas baseadas nas premissas definidas</strong> e não garantem resultados futuros. A IA nunca aprova investimentos automaticamente.</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4" /> Novo Cenário</Button>
        {selectedIds.length >= 2 && (
          <Button onClick={handleCompare} size="sm" disabled={comparing}>
            {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Comparar {selectedIds.length} Cenários com IA
          </Button>
        )}
      </div>

      {/* AI Comparison Result */}
      {comparison?.analysis && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 mb-3"><GitCompare className="h-4 w-4 text-purple-600" /> Comparação IA</h3>
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">{comparison.analysis.comparison_summary}</p>
            {comparison.analysis.best_scenario && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                <p className="text-xs font-semibold text-emerald-600 uppercase">🏆 Melhor Cenário: {comparison.analysis.best_scenario}</p>
                <p className="text-xs text-neutral-600 mt-1">{comparison.analysis.best_justification}</p>
              </div>
            )}
            {comparison.analysis.risk_analysis?.length > 0 && <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Análise de Riscos</p><ul className="space-y-1">{comparison.analysis.risk_analysis.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-red-400">⚠</span>{r}</li>)}</ul></div>}
            {comparison.analysis.recommendations?.length > 0 && <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Recomendações</p><ul className="space-y-1">{comparison.analysis.recommendations.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-blue-400">→</span>{r}</li>)}</ul></div>}
            {comparison.analysis.priority_ranking?.length > 0 && <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Ranking de Prioridade</p><ol className="space-y-1">{comparison.analysis.priority_ranking.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-purple-400 font-medium">{i + 1}.</span>{r}</li>)}</ol></div>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((scenario) => {
          const tCfg = SCENARIO_TYPE_CONFIG[scenario.scenario_type] || {};
          const sCfg = SCENARIO_STATUS_CONFIG[scenario.status] || {};
          const isSelected = selectedIds.includes(scenario.id);
          return (
            <div key={scenario.id} className={`rounded-2xl border p-4 transition-colors ${isSelected ? 'border-purple-300 bg-purple-50/30' : 'border-neutral-200 bg-white'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(scenario.id)} className="mt-1 h-4 w-4 rounded border-neutral-300 text-purple-600" />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">{tCfg.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-neutral-800">{scenario.name}</h4>
                    <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                  </div>
                  {scenario.description && <p className="text-xs text-neutral-500 mt-0.5">{scenario.description}</p>}
                  {scenario.assumptions && <div className="mt-2 rounded-lg border border-neutral-100 bg-neutral-50 p-2"><p className="text-[10px] font-semibold text-neutral-400 uppercase">Premissas</p><p className="text-xs text-neutral-600">{scenario.assumptions}</p></div>}
                  {scenario.impact_summary && <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/30 p-2"><p className="text-[10px] font-semibold text-blue-500 uppercase">Impacto Projetado</p><p className="text-xs text-neutral-600">{scenario.impact_summary}</p></div>}
                  {scenario.projected_metrics && Object.keys(scenario.projected_metrics).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(scenario.projected_metrics).slice(0, 4).map(([k, v]) => <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">{k}: {typeof v === 'number' && v > 1000 ? formatBRL(v) : String(v)}</span>)}
                    </div>
                  )}
                  <p className="text-[10px] text-neutral-300 italic mt-2">⚠ Resultados são estimativas e não garantem resultados futuros.</p>
                </div>
              </div>
              {scenario.status === 'rascunho' && <Button onClick={() => handleSimulate(scenario.id)} size="sm" variant="outline" className="mt-2 w-full">Simular</Button>}
            </div>
          );
        })}
      </div>
      {items.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><GitCompare className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum cenário criado</p></div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Cenário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Aumentar Preço +R$2,00" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label><select value={form.scenario_type} onChange={(e) => setForm({ ...form, scenario_type: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">{Object.entries(SCENARIO_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
            </div>
            <div><Label>Premissas</Label><Textarea value={form.assumptions} onChange={(e) => setForm({ ...form, assumptions: e.target.value })} rows={3} placeholder="Descreva as premissas utilizadas..." /></div>
            <div><Label>Variáveis (JSON)</Label><Textarea value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} rows={2} placeholder='{"price_increase": 2, "volume": 5000}' className="font-mono text-xs" /></div>
            <div><Label>Métricas Baseline (JSON)</Label><Textarea value={form.baseline_metrics} onChange={(e) => setForm({ ...form, baseline_metrics: e.target.value })} rows={2} placeholder='{"revenue": 125000}' className="font-mono text-xs" /></div>
            <div><Label>Métricas Projetadas (JSON)</Label><Textarea value={form.projected_metrics} onChange={(e) => setForm({ ...form, projected_metrics: e.target.value })} rows={2} placeholder='{"revenue": 135000}' className="font-mono text-xs" /></div>
            <div><Label>Resumo de Impacto</Label><Textarea value={form.impact_summary} onChange={(e) => setForm({ ...form, impact_summary: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}