import React, { useEffect, useState, useCallback } from "react";
import { HCM, ADVANCE_TYPE_CONFIG, ADVANCE_STATUS_CONFIG } from "@/lib/hcmEngine";
import { AppService } from "@/services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Wallet, FileText, Loader2, Calculator } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BaronSelect } from "@/design-system";
import { SyncManager } from "@/core/SyncManager";

export default function Advances({ refreshKey }) {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employee_id: '', type: 'vale_semanal', amount: 0, installments: 1, description: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [payrollData, setPayrollData] = useState(null);
  const [payrollEmp, setPayrollEmp] = useState('');
  const [calcPayroll, setCalcPayroll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [a, e] = await Promise.all([HCM.listAdvances(), HCM.listEmployees()]); setAdvances(a); setEmployees(e); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Auto-refresh quando QUALQUER modulo gravar/sincronizar EmployeeAdvance (sem F5).
  useEffect(() => {
    const unsub = SyncManager.onSync("EmployeeAdvance", () => load());
    return () => { if (typeof unsub === "function") unsub(); };
  }, [load]);

  const handleCreate = async () => {
    if (!form.employee_id) { toast({ title: "Selecione um colaborador", variant: "destructive" }); return; }
    setSaving(true);
    const emp = employees.find(e => e.id === form.employee_id);
    const amount = Number(form.amount);
    const installments = Number(form.installments);
    try {
      // createAdvance agora retorna o registro CONFIRMADO pelo read-back (RecoveryEngine).
      // Só exibimos "registrado" após o banco confirmar a leitura de volta.
      const confirmed = await HCM.createAdvance({ ...form, amount, installments, installment_amount: Math.round((amount / installments) * 100) / 100, installments_paid: 0, balance: amount, employee_name: emp?.full_name || '', status: 'ativo' });
      if (!confirmed?.id) throw new Error("Gravação não confirmada pelo read-back");
      toast({ title: "Vale/Empréstimo registrado", description: "Confirmado no banco e espelhado no Financeiro." });
      setForm({ employee_id: '', type: 'vale_semanal', amount: 0, installments: 1, description: '', date: new Date().toISOString().split('T')[0] });
      load();
    } catch (e) { toast({ title: "Erro ao registrar vale", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleGeneratePayroll = async () => {
    if (!payrollEmp) { toast({ title: "Selecione um colaborador", variant: "destructive" }); return; }
    setCalcPayroll(true);
    try {
      const res = await HCM.generatePayroll(payrollEmp);
      setPayrollData(res);
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setCalcPayroll(false); }
  };

  const [confirmingPayroll, setConfirmingPayroll] = useState(false);

  // Lança de verdade: cria a despesa no Financeiro (entra no DRE), grava o
  // registro histórico da folha, e quita os vales que entraram no cálculo —
  // sem isso, o "calcular" nunca virava lançamento contábil de fato.
  const handleConfirmPayroll = async () => {
    if (!payrollData) return;
    setConfirmingPayroll(true);
    try {
      const now = new Date().toISOString().split("T")[0];
      const month = payrollData.month || new Date().getMonth() + 1;
      const year = payrollData.year || new Date().getFullYear();

      const transaction = await AppService.create("FinancialTransaction", {
        description: `Folha de pagamento — ${payrollData.employee_name} (${month}/${year})`,
        type: "a_pagar",
        amount: payrollData.net_salary,
        due_date: now,
        payment_date: now,
        status: "pago",
        category: "salarios",
        origin: "folha",
        payment_method: payrollData.payment_method || "pix",
        notes: `Bruto: R$ ${payrollData.gross_salary?.toFixed(2)} | Descontos: R$ ${payrollData.total_discounts?.toFixed(2)} | Líquido: R$ ${payrollData.net_salary?.toFixed(2)}`,
      }, { module: "rh", validate: false });

      await AppService.create("Payroll", {
        employee_id: payrollData.employee_id,
        employee_name: payrollData.employee_name,
        period_month: month,
        period_year: year,
        period_type: "folha",
        base_salary: payrollData.base_salary,
        overtime_hours: payrollData.overtime_hours,
        overtime_value: payrollData.overtime_value,
        gross_salary: payrollData.gross_salary,
        advances: payrollData.advances,
        inss_discount: payrollData.inss_discount,
        total_discounts: payrollData.total_discounts,
        net_salary: payrollData.net_salary,
        payment_method: payrollData.payment_method || "pix",
        pix_key: payrollData.pix_key || "",
        payment_date: now,
        transaction_id: transaction.id,
        status: "pago",
      }, { module: "rh", validate: false });

      // Quita os vales ativos do funcionário que entraram nesse cálculo
      const empAdvances = advances.filter((a) => a.employee_id === payrollData.employee_id && a.status === "ativo");
      for (const adv of empAdvances) {
        await AppService.update("EmployeeAdvance", adv.id, { status: "quitado", balance: 0 }, { module: "rh", validate: false }).catch(() => {});
      }

      toast({ title: "Folha lançada", description: "Despesa criada no Financeiro (entra no DRE) e vales quitados." });
      setPayrollData(null);
      setPayrollEmp("");
      load();
    } catch (e) {
      toast({ title: "Erro ao lançar folha", description: e.message, variant: "destructive" });
    } finally {
      setConfirmingPayroll(false);
    }
  };


  const activeAdvances = advances.filter(a => a.status === 'ativo');
  const totalBalance = activeAdvances.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Vales Ativos</p><p className="text-xl font-bold text-blue-600 mt-1">{activeAdvances.length}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Saldo Devedor</p><p className="text-xl font-bold text-orange-600 mt-1">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-400">Total Registros</p><p className="text-xl font-bold text-neutral-800 mt-1">{advances.length}</p></div>
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Novo Vale/Empréstimo</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Vale/Empréstimo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Colaborador</Label><BaronSelect value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} options={employees.filter((e) => e.status !== 'demitido' && e.status !== 'inativo').map((e) => ({ value: e.id, label: e.full_name }))} placeholder="Selecione..." /></div>
              <div><Label className="text-xs">Tipo</Label><BaronSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={Object.entries(ADVANCE_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label className="text-xs">Parcelas</Label><Input type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label className="text-xs">Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => {}}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payroll Calculator */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Calculator className="h-4 w-4" /> Calculadora de Folha</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1"><BaronSelect value={payrollEmp} onChange={(v) => setPayrollEmp(v)} options={employees.filter((e) => e.status !== 'demitido' && e.status !== 'inativo').map((e) => ({ value: e.id, label: e.full_name }))} placeholder="Selecione um colaborador..." /></div>
          <Button onClick={handleGeneratePayroll} disabled={calcPayroll} size="sm">{calcPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}Calcular</Button>
        </div>
        {payrollData && (
          <div className="mt-4 rounded-xl border border-neutral-100 p-4">
            <h4 className="text-sm font-semibold text-neutral-800">{payrollData.employee_name}</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Salário Base:</span><span className="font-medium">R$ {payrollData.base_salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Horas Extras:</span><span className="font-medium">{payrollData.overtime_hours}h (+R$ {payrollData.overtime_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Vale Alimentação:</span><span className="font-medium">R$ {payrollData.food_vale?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Vale Transporte:</span><span className="font-medium">R$ {payrollData.transport_vale?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between border-t border-neutral-100 pt-2"><span className="text-neutral-500">Salário Bruto:</span><span className="font-semibold text-emerald-600">R$ {payrollData.gross_salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Adiantamentos:</span><span className="font-medium text-orange-600">- R$ {payrollData.advances?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">INSS (14%):</span><span className="font-medium text-red-500">- R$ {payrollData.inss_discount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between border-t border-neutral-100 pt-2"><span className="text-neutral-500">Total Descontos:</span><span className="font-medium text-red-500">R$ {payrollData.total_discounts?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between col-span-2 border-t-2 border-neutral-200 pt-2 mt-1"><span className="font-semibold text-neutral-700">Salário Líquido:</span><span className="text-lg font-bold text-emerald-600">R$ {payrollData.net_salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <Button onClick={handleConfirmPayroll} disabled={confirmingPayroll} className="mt-4 w-full gap-2">
              {confirmingPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {confirmingPayroll ? "Lançando..." : "Confirmar e Lançar Pagamento (gera despesa no DRE + quita vales)"}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : advances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Wallet className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum vale ou empréstimo registrado</p></div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr><th className="text-left p-3 font-medium text-neutral-500">Colaborador</th><th className="text-left p-3 font-medium text-neutral-500">Tipo</th><th className="text-left p-3 font-medium text-neutral-500">Valor</th><th className="text-left p-3 font-medium text-neutral-500">Parcelas</th><th className="text-left p-3 font-medium text-neutral-500">Saldo</th><th className="text-left p-3 font-medium text-neutral-500">Status</th></tr>
              </thead>
              <tbody>
                {advances.map((a) => {
                  const tCfg = ADVANCE_TYPE_CONFIG[a.type] || {};
                  const sCfg = ADVANCE_STATUS_CONFIG[a.status] || {};
                  return (
                    <tr key={a.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="p-3 font-medium text-neutral-700">{a.employee_name}</td>
                      <td className="p-3">{tCfg.emoji} {tCfg.label}</td>
                      <td className="p-3 text-neutral-600">R$ {(a.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-neutral-500">{a.installments_paid || 0}/{a.installments || 1}</td>
                      <td className="p-3 font-medium text-orange-600">R$ {(a.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3"><span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span></td>
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