import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import { analyzeDocument, mapExtractedToDocument } from "@/lib/documentAI";
import { validarBoleto, matchProduct, learnAlias } from "@/lib/processamentoIA";
import { formatBRL, getCategoryLabel, getCategoryEmoji } from "@/lib/documentUtils";
import { todayStr } from "@/lib/financialCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, XCircle, RefreshCw, Pencil, AlertTriangle,
  Loader2, ShieldCheck, Save,
} from "lucide-react";

const BOLETO_TYPES = ["boleto", "comprovante_pix", "comprovante_bancario"];
const NF_TYPES = ["nota_fiscal", "xml"];

const REASON_LABELS = {
  produtos_novos: "Produto não encontrado no cadastro",
  preco_alterado: "Valor divergente do histórico",
  linha_duplicada: "Linha digitável duplicada",
  boleto_igual: "Possível duplicidade de boleto",
  ja_pago: "Documento já pago anteriormente",
  cnpj_divergente: "CNPJ divergente do fornecedor cadastrado",
  valor_atipico: "Valor atípico para este fornecedor",
  duplicate: "Documento duplicado",
  ilegivel: "Documento ilegível — OCR não conseguiu extrair dados",
  xml_ausente: "XML ausente para conferência fiscal",
  linha_invalida: "Linha digitável inválida",
  fornecedor_desconhecido: "Fornecedor desconhecido",
  manual_review: "Documento sem roteamento automático — revise manualmente",
};

function getReasonLabel(alert) {
  if (REASON_LABELS[alert.type]) return REASON_LABELS[alert.type];
  return alert.message || "Divergência detectada";
}

export default function DocumentReviewActions({ doc, onAction }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    supplier: doc.supplier || "",
    value: doc.value || 0,
    due_date: doc.due_date || "",
    document_number: doc.document_number || "",
    bank: doc.bank || "",
    linha_digitavel: doc.linha_digitavel || "",
    cnpj: doc.cnpj || "",
  });

  const alerts = doc.alerts || [];
  const isPending = ["aguardando_confirmacao", "em_analise", "recebido"].includes(doc.status);
  const isRejected = doc.status === "rejeitado";
  const isProcessed = doc.status === "processado";

  if (!isPending && !isRejected) return null;

  // --- APROVAR: cria Payment (boleto) ou entrada estoque (NF) ---
  const handleApprove = async () => {
    setLoading("approve");
    try {
      const docType = (doc.category || "").toLowerCase();
      const now = new Date().toISOString();
      const relatedEntities = [];

      if (BOLETO_TYPES.includes(docType) && doc.value > 0) {
        const existing = await base44.entities.Payment.filter({ document_id: doc.id }, "-created_date", 3).catch(() => []);
        if (existing.length === 0) {
          const payment = await base44.entities.Payment.create({
            description: `${doc.supplier || "Documento"}${doc.document_number ? ` - ${doc.document_number}` : ""}`.trim(),
            supplier_name: doc.supplier || "",
            amount: doc.value,
            issue_date: doc.document_date || todayStr(),
            due_date: doc.due_date || "",
            bank: doc.bank || "",
            pix_key: doc.pix_copia_cola || "",
            barcode: doc.codigo_barras || doc.linha_digitavel || "",
            document_number: doc.document_number || "",
            document_id: doc.id,
            payment_method: docType === "comprovante_pix" ? "pix" : "boleto",
            status: "pendente",
          });
          relatedEntities.push({ entity_type: "Payment", entity_id: payment.id, entity_name: payment.description, relationship: "conta_a_pagar" });
          await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Payment", entity_id: payment.id, details: `Aprovação manual — Conta a Pagar criada: ${payment.amount}` });
        }
      } else if (NF_TYPES.includes(docType) && (doc.products || []).length > 0) {
        const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);
        for (const p of doc.products) {
          const m = matchProduct(p.name, allProducts);
          if (m?.product) {
            const prod = m.product;
            const newQty = (prod.stock_quantity || 0) + (p.quantity || 0);
            const newCost = p.unit_price || prod.cost_price;
            await base44.entities.Product.update(prod.id, {
              stock_quantity: newQty,
              cost_price: newCost,
              primary_supplier_name: doc.supplier || prod.primary_supplier_name,
            });
            if (p.name && p.name.toLowerCase() !== prod.name.toLowerCase()) {
              await learnAlias(prod.id, p.name);
            }
          }
        }
        await Core.audit({ audit_action: "confirm", module: "estoque", entity_type: "DBDocument", entity_id: doc.id, details: `Aprovação manual — entrada de estoque (${(doc.products || []).length} itens)` });
      }

      await base44.entities.DBDocument.update(doc.id, {
        status: "processado",
        confirmed_by: user?.full_name || "Usuário",
        confirmed_at: now,
        alerts: alerts.filter((a) => a.severity !== "urgent"),
        related_entities: [...(doc.related_entities || []), ...relatedEntities],
        duplicate_of: null,
      });
      await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: "Documento aprovado manualmente" });
      onAction?.();
    } catch (e) {
      console.error("approve error", e);
    } finally {
      setLoading(null);
    }
  };

  // --- REJEITAR ---
  const handleReject = async () => {
    setLoading("reject");
    try {
      await base44.entities.DBDocument.update(doc.id, {
        status: "rejeitado",
        rejected_by: user?.full_name || "Usuário",
        annotations: (doc.annotations || "") + `\n[Rejeitado em ${new Date().toLocaleString("pt-BR")}]`,
      });
      await Core.audit({ audit_action: "reject", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: "Documento rejeitado manualmente" });
      onAction?.();
    } catch (e) {
      console.error("reject error", e);
    } finally {
      setLoading(null);
    }
  };

  // --- REPROCESSAR: re-roda IA ---
  const handleReprocess = async () => {
    setLoading("reprocess");
    try {
      await base44.entities.DBDocument.update(doc.id, { status: "em_analise" });
      onAction?.();

      const extracted = await analyzeDocument(doc.file_url);
      const mapped = mapExtractedToDocument(extracted);
      await base44.entities.DBDocument.update(doc.id, { ...mapped, extracted_data: extracted });
      const fullDoc = { ...doc, ...mapped, id: doc.id };

      const docType = (mapped.category || "").toLowerCase();
      let newStatus = "processado";
      let newAlerts = [];

      if (BOLETO_TYPES.includes(docType)) {
        const { divergencias, clean } = await validarBoleto(fullDoc, mapped);
        newAlerts = divergencias.map((d) => ({ type: d.type, severity: d.severity === "critica" ? "urgent" : "warning", message: d.message }));
        if (clean && mapped.value > 0) {
          const existing = await base44.entities.Payment.filter({ document_id: doc.id }, "-created_date", 3).catch(() => []);
          if (existing.length === 0) {
            const payment = await base44.entities.Payment.create({
              description: `${mapped.supplier || "Documento"}${mapped.document_number ? ` - ${mapped.document_number}` : ""}`.trim(),
              supplier_name: mapped.supplier || "",
              amount: mapped.value,
              issue_date: mapped.document_date || todayStr(),
              due_date: mapped.due_date || "",
              bank: mapped.bank || "",
              barcode: mapped.codigo_barras || mapped.linha_digitavel || "",
              document_number: mapped.document_number || "",
              document_id: doc.id,
              payment_method: docType === "comprovante_pix" ? "pix" : "boleto",
              status: "pendente",
            });
            await base44.entities.DBDocument.update(doc.id, {
              status: "processado",
              confirmed_by: "BARON IA",
              confirmed_at: new Date().toISOString(),
              alerts: newAlerts,
              related_entities: [...(doc.related_entities || []), { entity_type: "Payment", entity_id: payment.id, entity_name: payment.description, relationship: "conta_a_pagar" }],
            });
            await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Payment", entity_id: payment.id, details: `Reprocessamento IA — Conta a Pagar: ${payment.amount}` });
            onAction?.();
            return;
          }
        } else {
          newStatus = "aguardando_confirmacao";
        }
      } else if (NF_TYPES.includes(docType) && (mapped.products || []).length > 0) {
        const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);
        const newProducts = (mapped.products || []).filter((p) => {
          const m = matchProduct(p.name, allProducts);
          return !m || m.confidence < 0.85;
        });
        if (newProducts.length === 0) {
          for (const p of mapped.products) {
            const m = matchProduct(p.name, allProducts);
            if (m?.product) {
              const prod = m.product;
              await base44.entities.Product.update(prod.id, {
                stock_quantity: (prod.stock_quantity || 0) + (p.quantity || 0),
                cost_price: p.unit_price || prod.cost_price,
                primary_supplier_name: mapped.supplier || prod.primary_supplier_name,
              });
              if (p.name && p.name.toLowerCase() !== prod.name.toLowerCase()) {
                await learnAlias(prod.id, p.name);
              }
            }
          }
          await base44.entities.DBDocument.update(doc.id, {
            status: "processado",
            confirmed_by: "BARON IA",
            confirmed_at: new Date().toISOString(),
            alerts: [],
          });
          await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Reprocessamento IA — estoque atualizado` });
          onAction?.();
          return;
        } else {
          newAlerts = [{ type: "produtos_novos", severity: "warning", message: `${newProducts.length} produto(s) sem correspondência` }];
          newStatus = "aguardando_confirmacao";
        }
      } else {
        newStatus = "aguardando_confirmacao";
      }

      await base44.entities.DBDocument.update(doc.id, { status: newStatus, alerts: newAlerts });
      await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Reprocessamento — status: ${newStatus}` });
      onAction?.();
    } catch (e) {
      console.error("reprocess error", e);
      await base44.entities.DBDocument.update(doc.id, { status: "aguardando_confirmacao" }).catch(() => {});
      onAction?.();
    } finally {
      setLoading(null);
    }
  };

  // --- EDITAR: salvar dados corrigidos ---
  const handleSaveEdit = async () => {
    setLoading("edit");
    try {
      await base44.entities.DBDocument.update(doc.id, {
        ...editData,
        edited_by: user?.full_name,
        edited_at: new Date().toISOString(),
      });
      await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: "Dados extraídos editados manualmente" });
      setShowEdit(false);
      onAction?.();
    } catch (e) {
      console.error("edit error", e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold uppercase text-amber-600">
          {isRejected ? "Documento Rejeitado" : "Necessita Revisão"}
        </span>
      </div>

      {/* Motivos das divergências */}
      {alerts.length > 0 ? (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 shrink-0 ${a.severity === "urgent" ? "text-destructive" : "text-amber-600"}`}>
                {a.severity === "urgent" ? "🔴" : "🟡"}
              </span>
              <span className={a.severity === "urgent" ? "text-destructive" : "text-amber-700"}>
                {getReasonLabel(a)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isRejected ? "Documento foi rejeitado." : "Documento aguardando análise. Você pode aprovar, editar ou reprocessar."}
        </p>
      )}

      {/* Formulário de edição inline */}
      {showEdit && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold text-foreground">Editar dados extraídos:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Fornecedor</Label>
              <Input value={editData.supplier} onChange={(e) => setEditData({ ...editData, supplier: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Valor (R$)</Label>
              <Input type="number" step="0.01" value={editData.value} onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Vencimento</Label>
              <Input type="date" value={editData.due_date} onChange={(e) => setEditData({ ...editData, due_date: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Nº Documento</Label>
              <Input value={editData.document_number} onChange={(e) => setEditData({ ...editData, document_number: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">CNPJ</Label>
              <Input value={editData.cnpj} onChange={(e) => setEditData({ ...editData, cnpj: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Banco</Label>
              <Input value={editData.bank} onChange={(e) => setEditData({ ...editData, bank: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">Linha Digitável</Label>
              <Input value={editData.linha_digitavel} onChange={(e) => setEditData({ ...editData, linha_digitavel: e.target.value })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={loading === "edit"} className="h-7 text-xs gap-1">
              {loading === "edit" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowEdit(false)} className="h-7 text-xs">Cancelar</Button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      {!showEdit && !isRejected && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={loading !== null}
            className="h-8 gap-1.5 bg-baron-success text-white hover:bg-baron-success/90"
          >
            {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEdit(true)}
            disabled={loading !== null}
            className="h-8 gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReprocess}
            disabled={loading !== null}
            className="h-8 gap-1.5"
          >
            {loading === "reprocess" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reprocessar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={loading !== null}
            className="h-8 gap-1.5 text-destructive hover:text-destructive"
          >
            {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Rejeitar
          </Button>
        </div>
      )}

      {/* Se rejeitado, botão para reprocessar/reabrir */}
      {isRejected && !showEdit && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReprocess}
            disabled={loading !== null}
            className="h-8 gap-1.5"
          >
            {loading === "reprocess" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reprocessar
          </Button>
        </div>
      )}

      {/* Indicador de processamento */}
      {loading && (
        <p className="text-[10px] text-muted-foreground">
          {loading === "approve" && "Aprovando e criando lançamento..."}
          {loading === "reprocess" && "IA reprocessando documento..."}
          {loading === "edit" && "Salvando alterações..."}
          {loading === "reject" && "Rejeitando documento..."}
        </p>
      )}
    </div>
  );
}