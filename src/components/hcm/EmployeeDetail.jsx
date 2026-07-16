import React, { useEffect, useState, useCallback } from "react";
import { HCM, EMPLOYEE_STATUS_CONFIG, DEPARTMENT_CONFIG, CAREER_LEVEL_CONFIG, SHIFT_CONFIG, CONTRACT_TYPE_CONFIG, DOC_TYPE_CONFIG, DOC_STATUS_CONFIG, ADVANCE_TYPE_CONFIG, ADVANCE_STATUS_CONFIG, TRAINING_STATUS_CONFIG, TRAINING_TYPE_CONFIG, REVIEW_CRITERIA, RISK_CONFIG } from "@/lib/hcmEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BaronSelect } from "@/design-system";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Brain, Loader2, Shield, Check, Clock, FileText, GraduationCap, Award, AlertTriangle, Rocket, CheckCircle2, Sparkles, Pencil } from "lucide-react";

export default function EmployeeDetail({ employeeId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await HCM.getEmployeeDetail(employeeId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try { setAnalysis(await HCM.aiAnalyze(employeeId)); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  const handleOnboarding = async () => {
    setLoadingOnboarding(true);
    try { setOnboarding(await HCM.generateOnboarding(employeeId)); }
    catch (e) { console.error(e); }
    finally { setLoadingOnboarding(false); }
  };

  const openEdit = () => {
    const emp = data.employee;
    setEditForm({
      full_name: emp.full_name || "", short_name: emp.short_name || "", phone: emp.phone || "", email: emp.email || "",
      position: emp.position || "", department: emp.department || "producao", career_level: emp.career_level || "auxiliar",
      shift: emp.shift || "integral", contract_type: emp.contract_type || "clt", status: emp.status || "ativo",
      salary: emp.salary || 0, hire_date: emp.hire_date || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await HCM.updateEmployee(employeeId, { ...editForm, salary: Number(editForm.salary) });
      toast({ title: "Colaborador atualizado" });
      setEditOpen(false);
      load();
    } catch (e) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading || !data) return <div className="h-96 animate-pulse rounded-2xl bg-neutral-200/60" />;

  const e = data.employee;
  const sCfg = EMPLOYEE_STATUS_CONFIG[e.status] || {};
  const dCfg = DEPARTMENT_CONFIG[e.department] || {};
  const lCfg = CAREER_LEVEL_CONFIG[e.career_level] || {};
  const shCfg = SHIFT_CONFIG[e.shift] || {};
  const cCfg = CONTRACT_TYPE_CONFIG[e.contract_type] || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Editar cadastro</Button>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-3xl">{e.photo_url ? <img src={e.photo_url} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : dCfg.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-neutral-900">{e.full_name}</h2>
              <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-2 py-0.5 text-xs font-medium`}><span className={`inline-block h-1.5 w-1.5 rounded-full ${sCfg.dot} mr-1`} />{sCfg.label}</span>
              <span className={`rounded-full ${dCfg.bg} ${dCfg.color} px-2 py-0.5 text-xs font-medium`}>{dCfg.emoji} {dCfg.label}</span>
              <span className={`rounded-full ${cCfg.bg} ${cCfg.color} px-2 py-0.5 text-xs font-medium`}>{cCfg.label}</span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">{e.position} · {lCfg.label} · {shCfg.emoji} {shCfg.label}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
              {e.phone && <span>📞 {e.phone}</span>}
              {e.email && <span>✉️ {e.email}</span>}
              {e.hire_date && <span>📅 Admissão: {new Date(e.hire_date).toLocaleDateString('pt-BR')}</span>}
              <span>💰 R$ {(e.salary || 0).toLocaleString('pt-BR')}</span>
              <span>⏰ Banco: <span className={e.bank_hours_balance < 0 ? 'text-red-600 font-medium' : 'text-neutral-600'}>{e.bank_hours_balance || 0}min</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-bold text-neutral-800">Análise IA - Especialista de RH</h3>
          <div className="flex-1" />
          <Button onClick={handleAnalyze} disabled={analyzing} size="sm" variant="outline">{analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}{analyzing ? "Analisando..." : "Analisar"}</Button>
        </div>
        {analysis && analysis.analysis ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">{analysis.analysis.overall_assessment}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs text-neutral-400">Risco de Desligamento</p>{(() => { const rCfg = RISK_CONFIG[analysis.analysis.turnover_risk] || {}; return <div className="mt-1 flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${rCfg.dot}`} /><span className={`text-sm font-semibold ${rCfg.color}`}>{rCfg.label}</span></div>; })()}</div>
              <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs text-neutral-400">Sobrecarga</p>{(() => { const rCfg = RISK_CONFIG[analysis.analysis.overload] || {}; return <div className="mt-1 flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${rCfg.dot}`} /><span className={`text-sm font-semibold ${rCfg.color}`}>{rCfg.label}</span></div>; })()}</div>
            </div>
            {analysis.analysis.promotion_suggestion === 'sim' || analysis.analysis.promotion_suggestion === 'true' ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3"><div className="flex items-center gap-2"><Rocket className="h-4 w-4 text-emerald-600" /><p className="text-sm font-semibold text-emerald-700">Sugestão de Promoção</p></div><p className="text-xs text-neutral-600 mt-1">{analysis.analysis.promotion_reason}</p></div>
            ) : null}
            {analysis.analysis.risk_factors?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Fatores de Risco</p><div className="flex flex-wrap gap-1">{analysis.analysis.risk_factors.map((f, i) => <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">{f}</span>)}</div></div>
            )}
            {analysis.analysis.training_suggestions?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Treinamentos Sugeridos</p><div className="flex flex-wrap gap-1">{analysis.analysis.training_suggestions.map((t, i) => <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{t}</span>)}</div></div>
            )}
            {analysis.analysis.document_alerts?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Alertas de Documentos</p><div className="flex flex-wrap gap-1">{analysis.analysis.document_alerts.map((d, i) => <span key={i} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">{d}</span>)}</div></div>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 text-center py-4">Clique em "Analisar" para que a IA avalie risco de desligamento, sugira treinamentos, identifique sobrecarga e sugira promoções.</p>
        )}
      </div>

      {/* Onboarding */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-bold text-neutral-800">Onboarding</h3>
          <div className="flex-1" />
          <Button onClick={handleOnboarding} disabled={loadingOnboarding} size="sm" variant="outline">{loadingOnboarding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Verificar</Button>
        </div>
        {onboarding ? (
          <div>
            <div className="mb-3 h-2 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${onboarding.progress_pct}%` }} /></div>
            <div className="grid grid-cols-2 gap-2">
              {onboarding.checklist.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg border p-2 ${c.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-neutral-100'}`}>
                  <div className={`flex h-5 w-5 items-center justify-center rounded ${c.completed ? 'bg-emerald-500' : 'border border-neutral-300'}`}>{c.completed && <Check className="h-3 w-3 text-white" />}</div>
                  <span className={`text-xs ${c.completed ? 'text-neutral-500 line-through' : 'text-neutral-700'}`}>{c.description}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="text-sm text-neutral-400 text-center py-2">Clique em "Verificar" para gerar o checklist de onboarding.</p>}
      </div>

      {/* Documents */}
      {data.documents?.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><FileText className="h-4 w-4" /> Documentos</h3>
          <div className="space-y-2">
            {data.documents.map((d) => {
              const dTCfg = DOC_TYPE_CONFIG[d.doc_type] || {};
              const dSCfg = DOC_STATUS_CONFIG[d.status] || {};
              return (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                  <span>{dTCfg.emoji}</span>
                  <span className="text-sm text-neutral-700 flex-1">{d.doc_name}</span>
                  {d.expiry_date && <span className="text-xs text-neutral-400">{new Date(d.expiry_date).toLocaleDateString('pt-BR')}</span>}
                  <span className={`rounded-full ${dSCfg.bg} ${dSCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{dSCfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews + Trainings + Advances + Occurrences in grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.reviews?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Award className="h-4 w-4" /> Avaliações</h3>
            <div className="space-y-2">
              {data.reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-neutral-100 p-2">
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-neutral-700">{r.period}</span><span className="text-sm font-bold text-neutral-800">{r.average_score?.toFixed(1)}</span></div>
                  {r.comments && <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{r.comments}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.trainings?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><GraduationCap className="h-4 w-4" /> Treinamentos</h3>
            <div className="space-y-2">
              {data.trainings.map((t) => {
                const tCfg = TRAINING_STATUS_CONFIG[t.status] || {};
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                    <span className="text-sm text-neutral-700 flex-1">{t.title}</span>
                    <span className={`rounded-full ${tCfg.bg} ${tCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{tCfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {data.advances?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Clock className="h-4 w-4" /> Vales & Empréstimos</h3>
            <div className="space-y-2">
              {data.advances.map((a) => {
                const aCfg = ADVANCE_TYPE_CONFIG[a.type] || {};
                const sCfg2 = ADVANCE_STATUS_CONFIG[a.status] || {};
                return (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                    <span>{aCfg.emoji}</span>
                    <span className="text-sm text-neutral-700 flex-1">{aCfg.label}</span>
                    <span className="text-xs text-neutral-500">R$ {(a.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className={`rounded-full ${sCfg2.bg} ${sCfg2.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg2.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {data.occurrences?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><AlertTriangle className="h-4 w-4" /> Ocorrências</h3>
            <div className="space-y-2">
              {data.occurrences.map((o) => (
                <div key={o.id} className="rounded-lg border border-neutral-100 p-2">
                  <p className="text-sm text-neutral-700">{o.description}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{o.type} · {o.date ? new Date(o.date).toLocaleDateString('pt-BR') : ''} {o.resolved ? '✓' : '⚠'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Colaborador</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome Completo</Label><Input value={editForm.full_name} onChange={(ev) => setEditForm({ ...editForm, full_name: ev.target.value })} /></div>
                <div><Label className="text-xs">Nome de Guerra</Label><Input value={editForm.short_name} onChange={(ev) => setEditForm({ ...editForm, short_name: ev.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Telefone</Label><Input value={editForm.phone} onChange={(ev) => setEditForm({ ...editForm, phone: ev.target.value })} /></div>
                <div><Label className="text-xs">Email</Label><Input value={editForm.email} onChange={(ev) => setEditForm({ ...editForm, email: ev.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cargo</Label><Input value={editForm.position} onChange={(ev) => setEditForm({ ...editForm, position: ev.target.value })} /></div>
                <div><Label className="text-xs">Departamento</Label><BaronSelect value={editForm.department} onChange={(v) => setEditForm({ ...editForm, department: v })} options={Object.entries(DEPARTMENT_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Nível</Label><BaronSelect value={editForm.career_level} onChange={(v) => setEditForm({ ...editForm, career_level: v })} options={Object.entries(CAREER_LEVEL_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                <div><Label className="text-xs">Turno</Label><BaronSelect value={editForm.shift} onChange={(v) => setEditForm({ ...editForm, shift: v })} options={Object.entries(SHIFT_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                <div><Label className="text-xs">Contrato</Label><BaronSelect value={editForm.contract_type} onChange={(v) => setEditForm({ ...editForm, contract_type: v })} options={Object.entries(CONTRACT_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Status</Label><BaronSelect value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={Object.entries(EMPLOYEE_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                <div><Label className="text-xs">Salário (R$)</Label><Input type="number" value={editForm.salary} onChange={(ev) => setEditForm({ ...editForm, salary: ev.target.value })} /></div>
                <div><Label className="text-xs">Admissão</Label><Input type="date" value={editForm.hire_date} onChange={(ev) => setEditForm({ ...editForm, hire_date: ev.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar alterações"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}