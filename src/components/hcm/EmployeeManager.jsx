import React, { useEffect, useState, useCallback } from "react";
import { HCM, EMPLOYEE_STATUS_CONFIG, DEPARTMENT_CONFIG, CAREER_LEVEL_CONFIG, SHIFT_CONFIG, CONTRACT_TYPE_CONFIG } from "@/lib/hcmEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const EMPTY = { full_name: '', short_name: '', cpf: '', rg: '', phone: '', email: '', position: '', department: 'producao', shift: 'integral', salary: 0, salary_type: 'mensal', contract_type: 'clt', career_level: 'auxiliar', hire_date: new Date().toISOString().split('T')[0], pix_key: '', pix_type: 'cpf', bank_name: '', bank_agency: '', bank_account: '', city: '', state: 'CE', status: 'ativo', schedule_type: 'fixo', work_schedule: '', transport_vale: 0, food_vale: 0, uniform_delivered: false, badge_delivered: false, epi_delivered: false, notes: '' };

export default function EmployeeManager({ refreshKey, onSelectEmployee }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await HCM.listEmployees()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = items.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.full_name?.toLowerCase().includes(s) || e.position?.toLowerCase().includes(s) || e.cpf?.includes(s);
  });

  const handleCreate = async () => {
    if (!form.full_name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await HCM.createEmployee({ ...form, salary: Number(form.salary), transport_vale: Number(form.transport_vale), food_vale: Number(form.food_vale) });
      toast({ title: "Colaborador cadastrado" });
      setCreateOpen(false); setForm(EMPTY); load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, cargo, CPF..." className="pl-9" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Novo Colaborador</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Colaborador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome Completo *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label className="text-xs">Nome de Guerra</Label><Input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
                <div><Label className="text-xs">RG</Label><Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} /></div>
                <div><Label className="text-xs">Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label className="text-xs">Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cargo</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                <div><Label className="text-xs">Departamento</Label><select className={selectClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>{Object.entries(DEPARTMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label className="text-xs">Nível</Label><select className={selectClass} value={form.career_level} onChange={(e) => setForm({ ...form, career_level: e.target.value })}>{Object.entries(CAREER_LEVEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><Label className="text-xs">Turno</Label><select className={selectClass} value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>{Object.entries(SHIFT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><Label className="text-xs">Contrato</Label><select className={selectClass} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>{Object.entries(CONTRACT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><Label className="text-xs">Salário (R$)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Admissão</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
                <div><Label className="text-xs">Horário</Label><Input value={form.work_schedule} onChange={(e) => setForm({ ...form, work_schedule: e.target.value })} placeholder="Ex: 08:00-17:00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Chave PIX</Label><Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} /></div>
                <div><Label className="text-xs">Banco</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Vale Transporte</Label><Input type="number" value={form.transport_vale} onChange={(e) => setForm({ ...form, transport_vale: e.target.value })} /></div>
                <div><Label className="text-xs">Vale Alimentação</Label><Input type="number" value={form.food_vale} onChange={(e) => setForm({ ...form, food_vale: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum colaborador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => {
            const sCfg = EMPLOYEE_STATUS_CONFIG[emp.status] || {};
            const dCfg = DEPARTMENT_CONFIG[emp.department] || {};
            const lCfg = CAREER_LEVEL_CONFIG[emp.career_level] || {};
            const cCfg = CONTRACT_TYPE_CONFIG[emp.contract_type] || {};
            return (
              <button key={emp.id} onClick={() => onSelectEmployee?.(emp.id)} className="text-left rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-lg">{emp.photo_url ? <img src={emp.photo_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : dCfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-neutral-800 leading-tight">{emp.full_name}</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">{emp.position}</p>
                  </div>
                  <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}><span className={`inline-block h-1.5 w-1.5 rounded-full ${sCfg.dot} mr-1`} />{sCfg.label}</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className={`rounded-full ${dCfg.bg} ${dCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{dCfg.emoji} {dCfg.label}</span>
                  <span className={`rounded-full ${cCfg.bg} ${cCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{cCfg.label}</span>
                  {emp.bank_hours_balance < 0 && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">Banco: {emp.bank_hours_balance}min</span>}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
                  <span>💰 R$ {(emp.salary || 0).toLocaleString('pt-BR')}</span>
                  {emp.hire_date && <span>Admissão: {new Date(emp.hire_date).toLocaleDateString('pt-BR')}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}