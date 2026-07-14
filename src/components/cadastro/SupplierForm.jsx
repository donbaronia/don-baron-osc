import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { BR_STATES } from "@/lib/masterData";
import { logAudit } from "@/lib/audit";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const EMPTY = {
  name: "", trade_name: "", document_number: "", phone: "", whatsapp: "",
  email: "", city: "", state: "", primary_contact: "",
  average_delivery_days: 0, payment_terms: "", notes: "", category: "", active: true,
};

export default function SupplierForm({ open, onClose, supplier, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(supplier ? { ...EMPTY, ...supplier } : EMPTY);
  }, [open, supplier]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (supplier?.id) {
        await base44.entities.Supplier.update(supplier.id, form);
        await logAudit({ user, module: "Cadastro Mestre", action: "Editou fornecedor", details: form.name });
      } else {
        await base44.entities.Supplier.create(form);
        await logAudit({ user, module: "Cadastro Mestre", action: "Criou fornecedor", details: form.name });
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Razão Social *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Nome Fantasia</Label>
              <Input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CNPJ</Label>
              <Input value={form.document_number} onChange={(e) => set("document_number", e.target.value)} className="mt-1.5" placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1.5" placeholder="Ex: Insumos, Embalagens" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Contato Principal</Label>
              <Input value={form.primary_contact} onChange={(e) => set("primary_contact", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prazo Médio de Entrega (dias)</Label>
              <Input type="number" value={form.average_delivery_days} onChange={(e) => set("average_delivery_days", parseInt(e.target.value) || 0)} className="mt-1.5" />
            </div>
            <div>
              <Label>Prazo de Pagamento</Label>
              <Input value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} className="mt-1.5" placeholder="Ex: 30/60 dias" />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1.5" rows={2} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-primary-info">Fornecedor Ativo</p>
              <p className="text-xs text-small-info">Disponível para novos pedidos</p>
            </div>
            <Switch checked={form.active} onCheckedChange={() => setForm((f) => ({ ...f, active: !f.active }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name}>
            {saving ? "Salvando..." : "Salvar Fornecedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}