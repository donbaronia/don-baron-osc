import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Tags, Building2 } from "lucide-react";

import { BaronSelect } from "@/design-system";
const CAT_TYPES = [{ v: "receita", l: "Receita" }, { v: "despesa", l: "Despesa" }, { v: "custo", l: "Custo" }, { v: "investimento", l: "Investimento" }, { v: "imposto", l: "Imposto" }, { v: "folha", l: "Folha" }, { v: "comissao", l: "Comissão" }, { v: "taxa", l: "Taxa" }, { v: "juro", l: "Juro" }, { v: "multa", l: "Multa" }, { v: "outra", l: "Outra" }];

export default function CostCenters() {
  const { toast } = useToast();
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [c, cat] = await Promise.all([
        base44.entities.CostCenter.list("-created_date", 100).catch(() => []),
        base44.entities.FinancialCategory.list("-created_date", 100).catch(() => []),
      ]);
      setCenters(c); setCategories(cat);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = (type) => {
    setDialog(type);
    setForm(type === "center" ? { code: "", name: "", description: "", parent_cost_center_name: "" } : { name: "", type: "despesa", description: "" });
  };
  const openEdit = (type, row) => { setDialog(type); setForm(row); };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" }); return; }
    try {
      if (dialog === "center") {
        if (form.id) {
          await base44.entities.CostCenter.update(form.id, { ...form, version: (form.version || 1) + 1 });
          await Core.audit({ audit_action: "update", module: "financeiro", entity_type: "CostCenter", entity_id: form.id, details: `Editou centro: ${form.name}` });
        } else {
          const c = await base44.entities.CostCenter.create(form);
          await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "CostCenter", entity_id: c.id, details: `Criou centro: ${form.name}` });
        }
      } else {
        if (form.id) {
          await base44.entities.FinancialCategory.update(form.id, { ...form, version: (form.version || 1) + 1 });
          await Core.audit({ audit_action: "update", module: "financeiro", entity_type: "FinancialCategory", entity_id: form.id, details: `Editou categoria: ${form.name}` });
        } else {
          const c = await base44.entities.FinancialCategory.create(form);
          await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "FinancialCategory", entity_id: c.id, details: `Criou categoria: ${form.name}` });
        }
      }
      toast({ title: "Sucesso!" });
      setDialog(null); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
  };

  const remove = async (type, row) => {
    try {
      if (type === "center") await base44.entities.CostCenter.update(row.id, { deleted_at: new Date().toISOString(), deleted_by: "user", status: "arquivado" });
      else await base44.entities.FinancialCategory.update(row.id, { deleted_at: new Date().toISOString(), deleted_by: "user", status: "arquivado" });
      await Core.audit({ audit_action: "delete", module: "financeiro", entity_type: type === "center" ? "CostCenter" : "FinancialCategory", entity_id: row.id, details: `Arquivou: ${row.name}` });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const centerCols = [
    { key: "code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.code || "—"}</span> },
    { key: "name", label: "Nome" },
    { key: "parent_cost_center_name", label: "Pai" },
    { key: "description", label: "Descrição" },
    { key: "actions", label: "", render: r => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit("center", r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => remove("center", r)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
      </div>
    ) },
  ];

  const catCols = [
    { key: "name", label: "Nome", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "type", label: "Tipo", render: r => <span className="capitalize">{(r.type || "").replace(/_/g, " ")}</span> },
    { key: "description", label: "Descrição" },
    { key: "actions", label: "", render: r => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit("category", r)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => remove("category", r)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-neutral-700" /><h3 className="text-base font-semibold text-neutral-900">Centros de Custo</h3></div>
          <Button size="sm" onClick={() => openCreate("center")} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
        </div>
        <DataTable columns={centerCols} rows={centers} loading={loading} emptyTitle="Nenhum centro de custo" emptyDescription="Crie centros para categorizar despesas." />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Tags className="h-5 w-5 text-neutral-700" /><h3 className="text-base font-semibold text-neutral-900">Categorias Financeiras</h3></div>
          <Button size="sm" onClick={() => openCreate("category")} className="gap-2"><Plus className="h-4 w-4" /> Nova</Button>
        </div>
        <DataTable columns={catCols} rows={categories} loading={loading} emptyTitle="Nenhuma categoria" emptyDescription="Crie categorias para receitas e despesas." />
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} {dialog === "center" ? "Centro de Custo" : "Categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {dialog === "center" ? (
              <>
                <FormField label="Código"><Input value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} /></FormField>
                <FormField label="Nome *"><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
                <FormField label="Centro Pai"><Input value={form.parent_cost_center_name || ""} onChange={e => setForm({ ...form, parent_cost_center_name: e.target.value })} /></FormField>
                <FormField label="Descrição"><Input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField>
              </>
            ) : (
              <>
                <FormField label="Nome *"><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
                <FormField label="Tipo *"><BaronSelect value={form.type || "despesa"} onChange={(v) => setForm({ ...form, type: v })} options={CAT_TYPES.map((t) => ({ value: t.v, label: t.l }))} /></FormField>
                <FormField label="Descrição"><Input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}