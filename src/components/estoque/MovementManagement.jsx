import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { IE, brl } from "@/lib/inventoryEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";
import { BaronSelect } from "@/design-system";

const MOVEMENT_TYPES = [
  { v: "entrada", l: "Entrada", icon: ArrowDownCircle, color: "text-emerald-600", inbound: true },
  { v: "saida", l: "Saída", icon: ArrowUpCircle, color: "text-blue-600", inbound: false },
  { v: "transferencia", l: "Transferência", icon: ArrowUpCircle, color: "text-purple-600", inbound: false },
  { v: "producao", l: "Produção", icon: ArrowDownCircle, color: "text-emerald-600", inbound: true },
  { v: "perda", l: "Perda", icon: ArrowUpCircle, color: "text-rose-600", inbound: false },
  { v: "quebra", l: "Quebra", icon: ArrowUpCircle, color: "text-rose-600", inbound: false },
  { v: "vencimento", l: "Vencimento", icon: ArrowUpCircle, color: "text-orange-600", inbound: false },
  { v: "ajuste", l: "Ajuste", icon: ArrowDownCircle, color: "text-amber-600", inbound: true },
  { v: "inventario", l: "Inventário", icon: ArrowDownCircle, color: "text-amber-600", inbound: true },
  { v: "consumo", l: "Consumo", icon: ArrowUpCircle, color: "text-blue-600", inbound: false },
  { v: "doacao", l: "Doação", icon: ArrowUpCircle, color: "text-indigo-600", inbound: false },
  { v: "bonificacao", l: "Bonificação", icon: ArrowDownCircle, color: "text-emerald-600", inbound: true },
];

const STOCK_TYPES = ["materia_prima", "producao", "produto_acabado", "em_transito", "perdas", "consumo_interno", "marketing", "manutencao", "limpeza", "escritorio"];

const EMPTY = { movement_type: "entrada", product_id: "", quantity: 0, unit: "un", unit_cost: 0, reason: "", batch_number: "", expiry_date: "", document_number: "", supplier_name: "", from_stock_type: "", to_stock_type: "", notes: "" };

export default function MovementManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [prods, movs, sups] = await Promise.all([
        base44.entities.Product.filter({ active: true }, "name", 500).catch(() => []),
        base44.entities.Movement.filter({ deleted_at: null }, "-movement_date", 300).catch(() => []),
        base44.entities.Supplier.list("name", 300).catch(() => []),
      ]);
      setProducts(prods); setRows(movs); setSuppliers(sups);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (typeFilter === "todos" || r.movement_type === typeFilter) &&
    (!search || (r.product_name || "").toLowerCase().includes(search.toLowerCase()) || (r.movement_code || "").toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => { setForm({ ...EMPTY, responsible_name: user?.full_name || "" }); setDialog(true); };

  const handleSave = async () => {
    if (!form.product_id || !form.movement_type || form.quantity === undefined) { toast({ title: "Erro", description: "Produto, tipo e quantidade são obrigatórios", variant: "destructive" }); return; }
    if (form.movement_type === "entrada" && (!form.unit_cost || form.unit_cost <= 0)) {
      toast({ title: "Custo obrigatório", description: "Toda entrada precisa do valor gasto (custo unitário) para entrar corretamente no DRE.", variant: "destructive" });
      return;
    }
    const product = products.find(p => p.id === form.product_id);
    setSaving(true);
    try {
      await IE.processMovement({
        ...form,
        product_name: product?.name,
        unit: form.unit || product?.unit || "un",
        responsible_name: user?.full_name || "Sistema",
      });
      toast({ title: "Movimento registrado!", description: `${form.movement_type} — ${product?.name}` });
      setDialog(false); load();
    } catch (e) { toast({ title: "Erro", description: e.message || "Falha ao registrar", variant: "destructive" }); }
    setSaving(false);
  };

  const columns = [
    { key: "movement_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.movement_code || "—"}</span> },
    { key: "movement_type", label: "Tipo", render: r => {
      const mt = MOVEMENT_TYPES.find(m => m.v === r.movement_type);
      const Icon = mt?.icon || ArrowDownCircle;
      return <span className={`inline-flex items-center gap-1 text-xs font-medium ${mt?.color || "text-neutral-600"}`}><Icon className="h-3.5 w-3.5" />{mt?.l || r.movement_type}</span>;
    }},
    { key: "product_name", label: "Produto", render: r => <span className="font-medium text-neutral-900">{r.product_name}</span> },
    { key: "quantity", label: "Qtd", render: r => `${r.quantity} ${r.unit || ""}` },
    { key: "unit_cost", label: "Custo Unit.", render: r => r.unit_cost ? brl(r.unit_cost) : "—" },
    { key: "total_cost", label: "Total", render: r => r.total_cost ? brl(r.total_cost) : "—" },
    { key: "reason", label: "Motivo", render: r => r.reason || "—" },
    { key: "supplier_name", label: "Fornecedor", render: r => r.supplier_name || "—" },
    { key: "responsible_name", label: "Responsável" },
    { key: "movement_date", label: "Data/Hora", render: r => r.movement_date ? new Date(r.movement_date).toLocaleString("pt-BR") : "—" },
  ];

  const isInbound = MOVEMENT_TYPES.find(m => m.v === form.movement_type)?.inbound;

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("movimentacoes.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Movimentação</Button>
      </Toolbar>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter("todos")} className={`rounded-full px-3 py-1 text-xs font-medium ${typeFilter === "todos" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>Todos</button>
        {MOVEMENT_TYPES.map(t => (
          <button key={t.v} onClick={() => setTypeFilter(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${typeFilter === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
        ))}
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma movimentação" emptyDescription="Registre movimentações para alterar o estoque." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Movimentação de Estoque</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Tipo de Movimentação *" className="col-span-2">
              <BaronSelect value={form.movement_type} onChange={(v) => setForm({ ...form, movement_type: v })} options={MOVEMENT_TYPES.map((t) => ({ value: t.v, label: t.l, icon: t.icon }))} placeholder="Selecione..." />
            </FormField>
            <FormField label="Produto *" className="col-span-2">
              <BaronSelect value={form.product_id} onChange={(v) => { const p = products.find((x) => x.id === v); setForm({ ...form, product_id: v, unit: p?.unit || "un" }); }} options={products.map((p) => ({ value: p.id, label: p.name }))} placeholder="Selecione..." />
            </FormField>
            <FormField label="Quantidade *"><Input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Unidade"><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></FormField>
            {isInbound && <FormField label={form.movement_type === "entrada" ? "Custo Unit. *" : "Custo Unit."}><Input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} /></FormField>}
            {form.movement_type === "transferencia" ? (
              <>
                <FormField label="Estoque Origem"><BaronSelect value={form.from_stock_type} onChange={(v) => setForm({ ...form, from_stock_type: v })} options={STOCK_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} placeholder="Selecione..." /></FormField>
                <FormField label="Estoque Destino"><BaronSelect value={form.to_stock_type} onChange={(v) => setForm({ ...form, to_stock_type: v })} options={STOCK_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} placeholder="Selecione..." /></FormField>
              </>
            ) : isInbound ? (
              <FormField label="Fornecedor">
                <BaronSelect
                  value={form.supplier_name}
                  onChange={(v) => setForm({ ...form, supplier_name: v })}
                  options={suppliers.map((s) => ({ value: s.name, label: s.name }))}
                  placeholder={suppliers.length ? "Selecione..." : "Nenhum fornecedor cadastrado — cadastre em Cadastro > Fornecedores"}
                />
              </FormField>
            ) : null}
            {isInbound && <FormField label="Lote"><Input value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })} /></FormField>}
            {isInbound && <FormField label="Validade"><Input type="date" value={form.expiry_date || ""} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></FormField>}
            <FormField label="Nº Documento"><Input value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} /></FormField>
            <FormField label="Motivo" className="col-span-2"><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></FormField>
            <FormField label="Observações" className="col-span-2"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Processando..." : "Registrar Movimento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}