import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import {
  DOCUMENT_CATEGORIES, formatBRL, isImageFile, isPDFFile,
} from "@/lib/documentUtils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ZoomIn, ZoomOut, Check, X, Loader2, AlertTriangle, Sparkles, TrendingUp, Tag } from "lucide-react";

const EMPTY_FORM = {
  title: "", category: "outros", supplier: "", cnpj: "", cpf: "", document_number: "", chave_nota: "",
  value: 0, document_date: "", due_date: "", notes: "",
  bank: "", linha_digitavel: "", codigo_barras: "", pix_copia_cola: "", beneficiario: "",
  products: [], taxes: 0, freight: 0,
  gross_sales: 0, net_sales: 0, discounts: 0, campaigns: 0, fees: 0,
  order_count: 0, average_ticket: 0, period_start: "", period_end: "",
};

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

const inputCls = "mt-1";

export default function DocumentConfirmDialog({ open, onClose, document: doc, onConfirmed }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (open && doc) {
      setForm({ ...EMPTY_FORM, ...doc, extracted_data: undefined });
      setZoom(1);
    }
  }, [open, doc]);

  if (!doc) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isBoleto = form.category === "boleto" || form.category === "comprovante_pix";
  const isNF = form.category === "nota_fiscal";
  const isIFood = form.category === "relatorio_ifood";

  const updateProduct = (idx, key, val) => {
    setForm((f) => ({
      ...f,
      products: f.products.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, [key]: val };
        if (key === "quantity" || key === "unit_price") {
          updated.total = (updated.quantity || 0) * (updated.unit_price || 0);
        }
        return updated;
      }),
    }));
  };

  const addProduct = () =>
    setForm((f) => ({ ...f, products: [...f.products, { name: "", quantity: 0, unit_price: 0, total: 0 }] }));

  const removeProduct = (idx) =>
    setForm((f) => ({ ...f, products: f.products.filter((_, i) => i !== idx) }));

  const confirm = async () => {
    setSaving(true);
    try {
      await base44.entities.DBDocument.update(doc.id, {
        ...form,
        status: "processado",
        confirmed_by: user?.full_name || "Sistema",
        confirmed_at: new Date().toISOString(),
      });
      await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Confirmou: ${form.title || doc.title}` });

      if (isBoleto && form.value > 0) {
        const payment = await base44.entities.Payment.create({
          description: `${form.supplier || "Documento"}${form.document_number ? ` - ${form.document_number}` : ""}`.trim(),
          supplier_name: form.supplier,
          amount: form.value,
          issue_date: form.document_date,
          due_date: form.due_date,
          bank: form.bank,
          pix_key: form.pix_copia_cola,
          barcode: form.codigo_barras,
          document_number: form.document_number,
          document_id: doc.id,
          payment_method: form.category === "boleto" ? "boleto" : "pix",
          status: "pendente",
        });
        await base44.entities.DBDocument.update(doc.id, {
          related_entities: [...(doc.related_entities || []), { entity_type: "Payment", entity_id: payment.id, entity_name: payment.description, relationship: "conta_a_pagar" }],
        });
        await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Payment", entity_id: payment.id, details: `Conta a pagar via documento: ${formatBRL(form.value)} - ${form.supplier} (doc: ${doc.id})` });
      }

      onConfirmed?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    setSaving(true);
    await base44.entities.DBDocument.update(doc.id, {
      status: "rejeitado",
      rejected_by: user?.full_name || "Sistema",
    });
    await Core.audit({ audit_action: "reject", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Rejeitou: ${doc.title}` });
    setSaving(false);
    onConfirmed?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle>Conferência de Documento</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[calc(92vh-140px)] grid-cols-1 overflow-hidden lg:grid-cols-2">
          {/* File preview */}
          <div className="flex flex-col border-r border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Arquivo Original</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200"><ZoomOut className="h-4 w-4" /></button>
                <span className="w-10 text-center text-xs text-neutral-500">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200"><ZoomIn className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl border border-neutral-200 bg-white p-2">
              {isImageFile(doc.file_type, doc.file_url) ? (
                <img src={doc.file_url} alt={doc.title} style={{ transform: `scale(${zoom})`, transformOrigin: "center" }} className="max-h-full max-w-full object-contain transition-transform" />
              ) : isPDFFile(doc.file_type, doc.file_url) ? (
                <iframe src={doc.file_url} title={doc.title} className="h-full w-full" style={{ minHeight: "400px" }} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-neutral-400">
                  <span className="text-4xl">📎</span>
                  <p className="text-sm">Pré-visualização não disponível</p>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-amber-600 hover:underline">Abrir arquivo</a>
                </div>
              )}
            </div>
          </div>

          {/* Editable form */}
          <div className="overflow-y-auto p-6">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">Dados Extraídos pela IA — revise e confirme</h3>

            <div className="space-y-4">
              {/* AI summary */}
              {doc.ia_summary && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-xs font-semibold uppercase text-violet-700">Resumo da IA</span>
                  </div>
                  <p className="text-xs text-neutral-700">{doc.ia_summary}</p>
                </div>
              )}

              {/* Alerts */}
              {(doc.alerts || []).length > 0 && (
                <div className="space-y-1.5">
                  {(doc.alerts || []).map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border p-2 ${a.severity === "urgent" ? "border-rose-200 bg-rose-50" : a.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
                      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${a.severity === "urgent" ? "text-rose-600" : a.severity === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                      <span className={`text-xs ${a.severity === "urgent" ? "text-rose-700" : a.severity === "warning" ? "text-amber-700" : "text-blue-700"}`}>{a.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Classification flow */}
              {(doc.classification_flow || []).length > 0 && (
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="text-xs font-semibold uppercase text-neutral-500">Fluxo Sugerido</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(doc.classification_flow || []).map((s, i) => (
                      <React.Fragment key={i}>
                        <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">{s.step}</span>
                        {i < (doc.classification_flow || []).length - 1 && <span className="text-neutral-400 text-xs">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* IA price changes */}
              {(doc.ia_analysis?.price_changes || []).length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold uppercase text-amber-700">Alteracoes de Preco</span>
                  </div>
                  {(doc.ia_analysis?.price_changes || []).map((pc, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-neutral-700">{pc.product_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">{pc.old_price?.toFixed(2)} → {pc.new_price?.toFixed(2)}</span>
                        <span className={`font-medium ${pc.change_pct > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pc.change_pct > 0 ? "+" : ""}{pc.change_pct?.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Field label="Título">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoria">
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Nº do Documento">
                  <Input value={form.document_number} onChange={(e) => set("document_number", e.target.value)} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Fornecedor">
                  <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} className={inputCls} />
                </Field>
                <Field label="CNPJ / CPF">
                  <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} className={inputCls} placeholder="CNPJ" />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Valor (R$)">
                  <Input type="number" step="0.01" value={form.value} onChange={(e) => set("value", parseFloat(e.target.value) || 0)} className={inputCls} />
                </Field>
                <Field label="Data Emissão">
                  <Input type="date" value={form.document_date} onChange={(e) => set("document_date", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Vencimento">
                  <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Chave de Acesso NFe">
                <Input value={form.chave_nota} onChange={(e) => set("chave_nota", e.target.value)} className={inputCls} placeholder="44 dígitos" />
              </Field>

              {/* Boleto / PIX fields */}
              {isBoleto && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <h4 className="text-xs font-semibold uppercase text-amber-700">Dados do Boleto / PIX</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Banco"><Input value={form.bank} onChange={(e) => set("bank", e.target.value)} className={inputCls} /></Field>
                    <Field label="Beneficiário"><Input value={form.beneficiario} onChange={(e) => set("beneficiario", e.target.value)} className={inputCls} /></Field>
                  </div>
                  <Field label="Linha Digitável"><Input value={form.linha_digitavel} onChange={(e) => set("linha_digitavel", e.target.value)} className={inputCls} /></Field>
                  <Field label="Código de Barras"><Input value={form.codigo_barras} onChange={(e) => set("codigo_barras", e.target.value)} className={inputCls} /></Field>
                  <Field label="PIX Copia e Cola"><Input value={form.pix_copia_cola} onChange={(e) => set("pix_copia_cola", e.target.value)} className={inputCls} /></Field>
                  <p className="text-xs text-amber-700">⚠️ Ao confirmar, uma conta a pagar será criada automaticamente no Centro Financeiro.</p>
                </div>
              )}

              {/* NF products */}
              {isNF && (
                <div className="space-y-2 rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase text-neutral-500">Produtos</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addProduct} className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" />Adicionar</Button>
                  </div>
                  {form.products.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-1">
                      <Input value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)} placeholder="Produto" className="col-span-5 h-8 text-xs" />
                      <Input type="number" step="0.01" value={p.quantity} onChange={(e) => updateProduct(i, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qtd" className="col-span-2 h-8 text-xs" />
                      <Input type="number" step="0.01" value={p.unit_price} onChange={(e) => updateProduct(i, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Vl. Unit" className="col-span-2 h-8 text-xs" />
                      <span className="col-span-2 text-right text-xs font-medium text-neutral-700">{formatBRL(p.total)}</span>
                      <button onClick={() => removeProduct(i)} className="col-span-1 flex justify-center text-neutral-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {form.products.length === 0 && <p className="py-2 text-center text-xs text-neutral-400">Nenhum produto extraído.</p>}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Impostos (R$)"><Input type="number" step="0.01" value={form.taxes} onChange={(e) => set("taxes", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Frete (R$)"><Input type="number" step="0.01" value={form.freight} onChange={(e) => set("freight", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                  </div>
                </div>
              )}

              {/* iFood fields */}
              {isIFood && (
                <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <h4 className="text-xs font-semibold uppercase text-orange-700">Relatório iFood</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Venda Bruta"><Input type="number" step="0.01" value={form.gross_sales} onChange={(e) => set("gross_sales", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Venda Líquida"><Input type="number" step="0.01" value={form.net_sales} onChange={(e) => set("net_sales", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Descontos"><Input type="number" step="0.01" value={form.discounts} onChange={(e) => set("discounts", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Campanhas"><Input type="number" step="0.01" value={form.campaigns} onChange={(e) => set("campaigns", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Taxas iFood"><Input type="number" step="0.01" value={form.fees} onChange={(e) => set("fees", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Nº Pedidos"><Input type="number" value={form.order_count} onChange={(e) => set("order_count", parseInt(e.target.value) || 0)} className={inputCls} /></Field>
                    <Field label="Ticket Médio"><Input type="number" step="0.01" value={form.average_ticket} onChange={(e) => set("average_ticket", parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
                    <div />
                    <Field label="Data Inicial"><Input type="date" value={form.period_start} onChange={(e) => set("period_start", e.target.value)} className={inputCls} /></Field>
                    <Field label="Data Final"><Input type="date" value={form.period_end} onChange={(e) => set("period_end", e.target.value)} className={inputCls} /></Field>
                  </div>
                </div>
              )}

              <Field label="Observações">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} rows={2} />
              </Field>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-200 px-6 py-4">
          <Button variant="outline" onClick={reject} disabled={saving} className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
            <X className="h-4 w-4" /> Rejeitar
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirm} disabled={saving} className="gap-2 bg-neutral-900 hover:bg-neutral-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Salvando..." : "Confirmar Dados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}