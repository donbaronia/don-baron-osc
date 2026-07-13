import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import { brl, todayStr } from "@/lib/financialCenter";
import { baronHumor } from "@/lib/baronHumor";
import { formatBRL, isImageFile, isPDFFile, getCategoryEmoji } from "@/lib/documentUtils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Download, Eye, X, CreditCard } from "lucide-react";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const PAYMENT_METHODS = [
  { v: "pix", l: "PIX" },
  { v: "codigo_barras", l: "Código de Barras" },
  { v: "transferencia", l: "Transferência" },
  { v: "ted", l: "TED" },
  { v: "dinheiro", l: "Dinheiro" },
  { v: "cartao_credito", l: "Cartão" },
];

export default function MarkAsPaidDialog({ open, onClose, payment, document: doc, onPaid }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    payment_method: "pix",
    bank: "",
    payment_date: todayStr(),
    amount_paid: 0,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && payment) {
      setForm({
        payment_method: payment.payment_method || "pix",
        bank: payment.bank || "",
        payment_date: todayStr(),
        amount_paid: payment.amount || 0,
        notes: "",
      });
    }
  }, [open, payment]);

  if (!payment) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const confirm = async () => {
    setSaving(true);
    try {
      // 1. Atualizar Payment
      await base44.entities.Payment.update(payment.id, {
        status: "pago",
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        bank: form.bank,
        notes: form.notes,
        version: (payment.version || 1) + 1,
      });

      // 2. Criar transação no Fluxo de Caixa
      await base44.entities.FinancialTransaction.create({
        description: payment.description,
        type: "a_pagar",
        amount: form.amount_paid,
        due_date: payment.due_date,
        payment_date: form.payment_date,
        status: "pago",
        supplier: payment.supplier_name,
        supplier_id: payment.supplier_id,
        payment_method: form.payment_method,
        document_id: payment.document_id,
        document_number: payment.document_number,
        origin: "compra",
        notes: form.notes,
      });

      // 3. Auditoria
      await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "Payment", entity_id: payment.id, details: `Pagou: ${payment.description} - ${brl(form.amount_paid)} via ${form.payment_method}` });
      if (doc) {
        await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Documento pago: ${brl(form.amount_paid)}` });
      }

      baronHumor("boleto_pago");
      onPaid?.();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Marcar como Pago
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          {/* Documento original preview */}
          {doc && (
            <div className="sm:col-span-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-secondary shrink-0">
                  {isImageFile(doc.file_type, doc.file_url) ? (
                    <img src={doc.file_url} alt={doc.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl">{getCategoryEmoji(doc.category)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.supplier || "—"} · {formatBRL(payment.amount)}</p>
                  <div className="mt-1 flex gap-2">
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Eye className="h-3 w-3" /> Visualizar
                    </a>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="h-3 w-3" /> Baixar
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Forma de Pagamento</Label>
            <select className={SEL} value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Banco Utilizado</Label>
            <Input value={form.bank} onChange={(e) => set("bank", e.target.value)} placeholder="Ex: Banco do Brasil" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data do Pagamento</Label>
            <Input type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Valor Pago (R$)</Label>
            <Input type="number" step="0.01" value={form.amount_paid} onChange={(e) => set("amount_paid", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs">Observação</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Observações sobre o pagamento..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={confirm} disabled={saving} className="gap-2">
            {saving ? "Registrando..." : <><Check className="h-4 w-4" /> Confirmar Pagamento</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}