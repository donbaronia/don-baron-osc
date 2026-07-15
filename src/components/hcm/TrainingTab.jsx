import React, { useEffect, useState, useCallback } from "react";
import { HCM, TRAINING_TYPE_CONFIG, TRAINING_STATUS_CONFIG } from "@/lib/hcmEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GraduationCap, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BaronSelect } from "@/design-system";

export default function TrainingTab({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employee_id: '', title: '', type: 'interno', category: '', provider: '', duration_hours: 0, start_date: new Date().toISOString().split('T')[0], is_mandatory: false, notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [t, e] = await Promise.all([HCM.listTrainings(), HCM.listEmployees()]); setItems(t); setEmployees(e); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCreate = async () => {
    if (!form.employee_id || !form.title.trim()) { toast({ title: "Colaborador e título obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    const emp = employees.find(e => e.id === form.employee_id);
    try {
      await HCM.createTraining({ ...form, duration_hours: Number(form.duration_hours), employee_name: emp?.full_name || '', status: 'pendente' });
      toast({ title: "Treinamento criado" });
      setForm({ employee_id: '', title: '', type: 'interno', category: '', provider: '', duration_hours: 0, start_date: new Date().toISOString().split('T')[0], is_mandatory: false, notes: '' });
      load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await HCM.updateTraining(id, { status, completion_date: status === 'concluido' ? new Date().toISOString().split('T')[0] : null }); load(); }
    catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };


  const pending = items.filter(t => t.status === 'pendente');
  const inProgress = items.filter(t => t.status === 'em_andamento');
  const completed = items.filter(t => t.status === 'concluido');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-neutral-400" /><p className="text-xs text-neutral-400">Pendentes</p></div><p className="text-xl font-bold text-amber-600 mt-1">{pending.length}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-400" /><p className="text-xs text-neutral-400">Em Andamento</p></div><p className="text-xl font-bold text-blue-600 mt-1">{inProgress.length}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><p className="text-xs text-neutral-400">Concluídos</p></div><p className="text-xl font-bold text-emerald-600 mt-1">{completed.length}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400" /><p className="text-xs text-neutral-400">Obrigatórios Pend.</p></div><p className="text-xl font-bold text-red-600 mt-1">{pending.filter(t => t.is_mandatory).length}</p></div>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Novo Treinamento</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Treinamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Colaborador</Label><BaronSelect value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} options={employees.map((e) => ({ value: e.id, label: e.full_name }))} placeholder="Selecione..." /></div>
              <div><Label className="text-xs">Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Tipo</Label><BaronSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={Object.entries(TRAINING_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                <div><Label className="text-xs">Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Segurança" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Instrutor/Provider</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
                <div><Label className="text-xs">Duração (h)</Label><Input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Data Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="mandatory" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} className="h-4 w-4 rounded border-neutral-300" /><Label htmlFor="mandatory" className="text-xs">Treinamento obrigatório</Label></div>
              <div><Label className="text-xs">Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><GraduationCap className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum treinamento registrado</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((t) => {
            const tCfg = TRAINING_TYPE_CONFIG[t.type] || {};
            const sCfg = TRAINING_STATUS_CONFIG[t.status] || {};
            return (
              <div key={t.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">{tCfg.emoji}</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-neutral-800">{t.title}</h4>
                    <p className="text-xs text-neutral-400">{t.employee_name}</p>
                  </div>
                  {t.is_mandatory && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Obrigatório</span>}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                  {t.category && <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{t.category}</span>}
                  {t.provider && <span className="text-[10px] text-neutral-400">{t.provider}</span>}
                  {t.duration_hours > 0 && <span className="text-[10px] text-neutral-400">{t.duration_hours}h</span>}
                </div>
                {t.status !== 'concluido' && (
                  <div className="mt-2">
                    <div className="w-36"><BaronSelect size="sm" value={t.status} onChange={(v) => handleStatusChange(t.id, v)} options={Object.entries(TRAINING_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                  </div>
                )}
                {t.completion_date && <p className="mt-2 text-[10px] text-emerald-600">✓ Concluído em {new Date(t.completion_date).toLocaleDateString('pt-BR')}{t.score ? ` · Nota: ${t.score}` : ''}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}