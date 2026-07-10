import React, { useEffect, useState, useCallback } from "react";
import { HCM, TIME_RECORD_STATUS_CONFIG, TIME_RECORD_TYPE_CONFIG } from "@/lib/hcmEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function TimeTracking({ refreshKey }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], clock_in: '08:00', clock_out: '17:00', type: 'manual', status: 'normal', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [r, e] = await Promise.all([HCM.listTimeRecords(), HCM.listEmployees()]); setRecords(r); setEmployees(e); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCreate = async () => {
    if (!form.employee_id) { toast({ title: "Selecione um colaborador", variant: "destructive" }); return; }
    setSaving(true);
    const emp = employees.find(e => e.id === form.employee_id);
    try {
      await HCM.createTimeRecord({ ...form, employee_name: emp?.full_name || '', late_minutes: form.status === 'atraso' ? 25 : 0 });
      toast({ title: "Registro criado" });
      setForm({ employee_id: '', date: new Date().toISOString().split('T')[0], clock_in: '08:00', clock_out: '17:00', type: 'manual', status: 'normal', notes: '' });
      load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const totalBankHours = employees.reduce((s, e) => s + (e.bank_hours_balance || 0), 0);
  const lateToday = records.filter(r => r.status === 'atraso').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">Registros Hoje</p>
          <p className="text-xl font-bold text-neutral-800 mt-1">{records.filter(r => r.date === new Date().toISOString().split('T')[0]).length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">Atrasos</p>
          <p className="text-xl font-bold text-red-600 mt-1">{lateToday}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">Banco de Horas Total</p>
          <p className={`text-xl font-bold mt-1 ${totalBankHours < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{totalBankHours}min</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Registrar Ponto</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar Ponto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Colaborador</Label><select className={selectClass} value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}><option value="">Selecione...</option>{employees.filter(e => e.status === 'ativo').map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label className="text-xs">Tipo</Label><select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.entries(TIME_RECORD_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Entrada</Label><Input type="time" value={form.clock_in} onChange={(e) => setForm({ ...form, clock_in: e.target.value })} /></div>
                <div><Label className="text-xs">Saída</Label><Input type="time" value={form.clock_out} onChange={(e) => setForm({ ...form, clock_out: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Status</Label><select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(TIME_RECORD_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div><Label className="text-xs">Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Clock className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum registro de ponto</p></div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3 font-medium text-neutral-500">Colaborador</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Data</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Entrada</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Saída</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Tipo</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Status</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Atraso</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 30).map((r) => {
                  const sCfg = TIME_RECORD_STATUS_CONFIG[r.status] || {};
                  const tCfg = TIME_RECORD_TYPE_CONFIG[r.type] || {};
                  return (
                    <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="p-3 font-medium text-neutral-700">{r.employee_name}</td>
                      <td className="p-3 text-neutral-500">{r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="p-3 text-neutral-600">{r.clock_in || '—'}</td>
                      <td className="p-3 text-neutral-600">{r.clock_out || '—'}</td>
                      <td className="p-3 text-neutral-400">{tCfg.emoji} {tCfg.label}</td>
                      <td className="p-3"><span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span></td>
                      <td className="p-3 text-neutral-500">{r.late_minutes > 0 ? `${r.late_minutes}min` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}