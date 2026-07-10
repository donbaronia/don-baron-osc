import React, { useEffect, useState, useCallback } from "react";
import { HCM, CANDIDATE_STATUS_CONFIG, CANDIDATE_SOURCE_CONFIG, JOB_OPENING_STATUS_CONFIG, DEPARTMENT_CONFIG, CAREER_LEVEL_CONFIG } from "@/lib/hcmEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Briefcase, UserPlus, Star } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Recruitment({ refreshKey }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candForm, setCandForm] = useState({ name: '', phone: '', email: '', position_applied: '', department: 'producao', source: 'indicacao' });
  const [jobForm, setJobForm] = useState({ title: '', department: 'producao', position: '', description: '', salary_min: 0, salary_max: 0, openings: 1, shift: 'integral', contract_type: 'clt' });
  const [saveCand, setSaveCand] = useState(false);
  const [saveJob, setSaveJob] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [c, j] = await Promise.all([HCM.listCandidates(), HCM.listJobOpenings()]); setCandidates(c); setJobs(j); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleStatusChange = async (id, status) => {
    try { await HCM.updateCandidate(id, { status }); load(); }
    catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const handleCreateCand = async () => {
    if (!candForm.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaveCand(true);
    try { await HCM.createCandidate(candForm); toast({ title: "Candidato cadastrado" }); setCandForm({ name: '', phone: '', email: '', position_applied: '', department: 'producao', source: 'indicacao' }); load(); }
    catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaveCand(false); }
  };

  const handleCreateJob = async () => {
    if (!jobForm.title.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    setSaveJob(true);
    try { await HCM.createJobOpening({ ...jobForm, salary_min: Number(jobForm.salary_min), salary_max: Number(jobForm.salary_max), openings: Number(jobForm.openings) }); toast({ title: "Vaga criada" }); setJobForm({ title: '', department: 'producao', position: '', description: '', salary_min: 0, salary_max: 0, openings: 1, shift: 'integral', contract_type: 'clt' }); load(); }
    catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaveJob(false); }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Vagas Abertas</h3>
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Nova Vaga</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nova Vaga</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Título *</Label><Input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Departamento</Label><select className={selectClass} value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}>{Object.entries(DEPARTMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                    <div><Label className="text-xs">Cargo</Label><Input value={jobForm.position} onChange={(e) => setJobForm({ ...jobForm, position: e.target.value })} /></div>
                  </div>
                  <div><Label className="text-xs">Descrição</Label><Textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} rows={2} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs">Salário Mín</Label><Input type="number" value={jobForm.salary_min} onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })} /></div>
                    <div><Label className="text-xs">Salário Máx</Label><Input type="number" value={jobForm.salary_max} onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })} /></div>
                    <div><Label className="text-xs">Vagas</Label><Input type="number" value={jobForm.openings} onChange={(e) => setJobForm({ ...jobForm, openings: e.target.value })} /></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreateJob} disabled={saveJob}>{saveJob ? "Salvando..." : "Criar Vaga"}</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center"><Briefcase className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-2 text-xs text-neutral-400">Nenhuma vaga</p></div>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => {
                const sCfg = JOB_OPENING_STATUS_CONFIG[j.status] || {};
                const dCfg = DEPARTMENT_CONFIG[j.department] || {};
                return (
                  <div key={j.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{dCfg.emoji}</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-neutral-800">{j.title}</h4>
                        <p className="text-xs text-neutral-400 line-clamp-1">{j.description}</p>
                      </div>
                      <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{sCfg.label}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-400">
                      <span>👤 {j.candidate_count || 0} candidatos</span>
                      <span>✅ {j.filled}/{j.openings} preenchidas</span>
                      <span>💰 R$ {j.salary_min?.toLocaleString('pt-BR')} - {j.salary_max?.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Candidatos</h3>
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><UserPlus className="h-3.5 w-3.5" />Novo Candidato</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Novo Candidato</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Nome *</Label><Input value={candForm.name} onChange={(e) => setCandForm({ ...candForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Telefone</Label><Input value={candForm.phone} onChange={(e) => setCandForm({ ...candForm, phone: e.target.value })} /></div>
                    <div><Label className="text-xs">Email</Label><Input value={candForm.email} onChange={(e) => setCandForm({ ...candForm, email: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Cargo Pretendido</Label><Input value={candForm.position_applied} onChange={(e) => setCandForm({ ...candForm, position_applied: e.target.value })} /></div>
                    <div><Label className="text-xs">Departamento</Label><select className={selectClass} value={candForm.department} onChange={(e) => setCandForm({ ...candForm, department: e.target.value })}>{Object.entries(DEPARTMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  </div>
                  <div><Label className="text-xs">Origem</Label><select className={selectClass} value={candForm.source} onChange={(e) => setCandForm({ ...candForm, source: e.target.value })}>{Object.entries(CANDIDATE_SOURCE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreateCand} disabled={saveCand}>{saveCand ? "Salvando..." : "Cadastrar"}</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center"><UserPlus className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-2 text-xs text-neutral-400">Nenhum candidato</p></div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => {
                const sCfg = CANDIDATE_STATUS_CONFIG[c.status] || {};
                const srcCfg = CANDIDATE_SOURCE_CONFIG[c.source] || {};
                return (
                  <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-neutral-800">{c.name}</h4>
                        <p className="text-xs text-neutral-400">{c.position_applied}</p>
                      </div>
                      {c.rating > 0 && <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < c.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`} />)}</div>}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400">{srcCfg.emoji} {srcCfg.label}</span>
                      <div className="flex-1" />
                      <select value={c.status} onChange={(e) => handleStatusChange(c.id, e.target.value)} className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
                        {Object.entries(CANDIDATE_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}