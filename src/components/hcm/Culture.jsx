import React, { useEffect, useState, useCallback } from "react";
import { HCM, RECOGNITION_TYPE_CONFIG, OCCURRENCE_TYPE_CONFIG, OCCURRENCE_SEVERITY_CONFIG } from "@/lib/hcmEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Award, AlertTriangle, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Culture({ refreshKey }) {
  const [recognitions, setRecognitions] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recForm, setRecForm] = useState({ employee_id: '', type: 'elogio', title: '', description: '', date: new Date().toISOString().split('T')[0], awarded_by: '', value: 0 });
  const [occForm, setOccForm] = useState({ employee_id: '', type: 'advertencia', date: new Date().toISOString().split('T')[0], description: '', severity: 'media', responsible_name: '', action_taken: '' });
  const [saveRec, setSaveRec] = useState(false);
  const [saveOcc, setSaveOcc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [r, o, e] = await Promise.all([HCM.listRecognitions(), HCM.listOccurrences(), HCM.listEmployees()]); setRecognitions(r); setOccurrences(o); setEmployees(e); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCreateRec = async () => {
    if (!recForm.employee_id || !recForm.title.trim()) { toast({ title: "Colaborador e título obrigatórios", variant: "destructive" }); return; }
    setSaveRec(true);
    const emp = employees.find(e => e.id === recForm.employee_id);
    try { await HCM.createRecognition({ ...recForm, value: Number(recForm.value), employee_name: emp?.full_name || '' }); toast({ title: "Reconhecimento registrado" }); setRecForm({ employee_id: '', type: 'elogio', title: '', description: '', date: new Date().toISOString().split('T')[0], awarded_by: '', value: 0 }); load(); }
    catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaveRec(false); }
  };

  const handleCreateOcc = async () => {
    if (!occForm.employee_id) { toast({ title: "Selecione um colaborador", variant: "destructive" }); return; }
    setSaveOcc(true);
    const emp = employees.find(e => e.id === occForm.employee_id);
    try { await HCM.createOccurrence({ ...occForm, employee_name: emp?.full_name || '', resolved: false }); toast({ title: "Ocorrência registrada" }); setOccForm({ employee_id: '', type: 'advertencia', date: new Date().toISOString().split('T')[0], description: '', severity: 'media', responsible_name: '', action_taken: '' }); load(); }
    catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaveOcc(false); }
  };

  const handleResolveOcc = async (id) => { try { await HCM.updateOccurrence(id, { resolved: true, resolved_at: new Date().toISOString() }); load(); } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); } };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Recognitions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Award className="h-4 w-4 text-amber-500" /> Reconhecimentos</h3>
          <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Novo</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Novo Reconhecimento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">Colaborador</Label><select className={selectClass} value={recForm.employee_id} onChange={(e) => setRecForm({ ...recForm, employee_id: e.target.value })}><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div><Label className="text-xs">Tipo</Label><select className={selectClass} value={recForm.type} onChange={(e) => setRecForm({ ...recForm, type: e.target.value })}>{Object.entries(RECOGNITION_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
                <div><Label className="text-xs">Título</Label><Input value={recForm.title} onChange={(e) => setRecForm({ ...recForm, title: e.target.value })} /></div>
                <div><Label className="text-xs">Descrição</Label><Textarea value={recForm.description} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Premiação (R$)</Label><Input type="number" value={recForm.value} onChange={(e) => setRecForm({ ...recForm, value: e.target.value })} /></div>
                  <div><Label className="text-xs">Concedido por</Label><Input value={recForm.awarded_by} onChange={(e) => setRecForm({ ...recForm, awarded_by: e.target.value })} /></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreateRec} disabled={saveRec}>{saveRec ? "Salvando..." : "Registrar"}</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {recognitions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center"><Award className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-2 text-xs text-neutral-400">Nenhum reconhecimento</p></div>
        ) : (
          <div className="space-y-2">
            {recognitions.map((r) => {
              const rCfg = RECOGNITION_TYPE_CONFIG[r.type] || {};
              return (
                <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{rCfg.emoji}</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-neutral-800">{r.title}</h4>
                      {r.description && <p className="text-xs text-neutral-500 mt-0.5">{r.description}</p>}
                    </div>
                    {r.value > 0 && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">R$ {r.value}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span className={`rounded-full ${rCfg.bg} ${rCfg.color} px-1.5 py-0.5 font-medium`}>{rCfg.label}</span>
                    <span>{r.employee_name}</span>
                    <span>· {r.awarded_by}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Occurrences */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><AlertTriangle className="h-4 w-4 text-red-500" /> Ocorrências</h3>
          <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Nova</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Ocorrência</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">Colaborador</Label><select className={selectClass} value={occForm.employee_id} onChange={(e) => setOccForm({ ...occForm, employee_id: e.target.value })}><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Tipo</Label><select className={selectClass} value={occForm.type} onChange={(e) => setOccForm({ ...occForm, type: e.target.value })}>{Object.entries(OCCURRENCE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
                  <div><Label className="text-xs">Severidade</Label><select className={selectClass} value={occForm.severity} onChange={(e) => setOccForm({ ...occForm, severity: e.target.value })}>{Object.entries(OCCURRENCE_SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                </div>
                <div><Label className="text-xs">Data</Label><Input type="date" value={occForm.date} onChange={(e) => setOccForm({ ...occForm, date: e.target.value })} /></div>
                <div><Label className="text-xs">Descrição</Label><Textarea value={occForm.description} onChange={(e) => setOccForm({ ...occForm, description: e.target.value })} rows={2} /></div>
                <div><Label className="text-xs">Ação Tomada</Label><Input value={occForm.action_taken} onChange={(e) => setOccForm({ ...occForm, action_taken: e.target.value })} /></div>
                <div><Label className="text-xs">Responsável</Label><Input value={occForm.responsible_name} onChange={(e) => setOccForm({ ...occForm, responsible_name: e.target.value })} /></div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreateOcc} disabled={saveOcc}>{saveOcc ? "Salvando..." : "Registrar"}</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {occurrences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center"><AlertTriangle className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-2 text-xs text-neutral-400">Nenhuma ocorrência</p></div>
        ) : (
          <div className="space-y-2">
            {occurrences.map((o) => {
              const tCfg = OCCURRENCE_TYPE_CONFIG[o.type] || {};
              const sCfg = OCCURRENCE_SEVERITY_CONFIG[o.severity] || {};
              return (
                <div key={o.id} className={`rounded-xl border p-3 ${o.resolved ? 'border-neutral-100 bg-neutral-50' : 'border-neutral-200 bg-white'}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{tCfg.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-700">{o.description}</p>
                    </div>
                    <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{sCfg.label}</span>
                    {o.resolved ? <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">✓ Resolvido</span> : <button onClick={() => handleResolveOcc(o.id)} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-100">Resolver</button>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span className={`rounded-full ${tCfg.bg} ${tCfg.color} px-1.5 py-0.5 font-medium`}>{tCfg.label}</span>
                    <span>{o.employee_name}</span>
                    {o.action_taken && <span>· {o.action_taken}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}