import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { brl } from "@/lib/financialCenter";
import {
  CheckCircle2, AlertTriangle, Package, Wallet, Factory,
  Bike, FileText, Truck, ChevronRight,
} from "lucide-react";

const MODULES = [
  { key: "estoque", label: "Estoque", icon: Package, route: "/estoque" },
  { key: "financeiro", label: "Financeiro", icon: Wallet, route: "/financeiro" },
  { key: "producao", label: "Produção", icon: Factory, route: "/producao" },
  { key: "delivery", label: "Delivery", icon: Truck, route: "/financeiro" },
  { key: "motoboys", label: "Motoboys", icon: Bike, route: "/motoboys" },
  { key: "documentos", label: "Documentos", icon: FileText, route: "/documentos-financeiros" },
];

export default function ExecutiveStatus() {
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 200).catch(() => []),
      base44.entities.Product.filter({ active: true, status: "ativo", controls_stock: { $ne: false } }, "-stock_quantity", 300).catch(() => []),
      base44.entities.ProductionRecord.filter({ status: { $in: ["planejada", "em_producao", "pausada"] } }, "-created_date", 50).catch(() => []),
      base44.entities.Courier.filter({ status: { $in: ["ativo", "em_entrega"] } }, "-created_date", 50).catch(() => []),
      base44.entities.DBDocument.filter({ status: { $in: ["recebido", "em_analise", "aguardando_confirmacao"] } }, "-created_date", 50).catch(() => []),
      base44.entities.Sale.filter({ status: "pendente" }, "-created_date", 50).catch(() => []),
    ]).then(([payments, products, production, couriers, docs, sales]) => {
      const vencidos = payments.filter((p) => p.due_date && p.due_date < today);
      const vencemHoje = payments.filter((p) => p.due_date === today);
      const boletosProblema = vencidos.length + vencemHoje.length;

      const lowStock = products.filter((p) => (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0));

      const noCheckin = couriers.filter((c) => !c.last_checkin_at || !c.last_checkin_at.startsWith(today));

      const map = {
        estoque: {
          ok: lowStock.length === 0,
          alert: lowStock.length > 0 ? `${lowStock.length} item(ns) abaixo do mínimo` : null,
        },
        financeiro: {
          ok: boletosProblema === 0,
          alert: boletosProblema > 0
            ? `${boletosProblema} boleto(s) ${vencidos.length > 0 ? "vencido(s)" : "vencendo hoje"}${vencidos.length > 0 ? ` — ${brl(vencidos.reduce((a, p) => a + (p.amount || 0), 0))}` : ""}`
            : null,
        },
        producao: {
          ok: production.length === 0,
          alert: production.length > 0 ? `${production.length} produção(ões) pendente(s)` : null,
        },
        delivery: {
          ok: sales.length === 0,
          alert: sales.length > 0 ? `${sales.length} pedido(s) pendente(s)` : null,
        },
        motoboys: {
          ok: noCheckin.length === 0 || couriers.length === 0,
          alert: noCheckin.length > 0 ? `${noCheckin.length} motoboy(s) sem check-in hoje` : null,
        },
        documentos: {
          ok: docs.length === 0,
          alert: docs.length > 0 ? `${docs.length} documento(s) aguardando` : null,
        },
      };

      setStatus(map);
    });
  }, []);

  if (!status) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MODULES.map((m) => (
          <div key={m.key} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    );
  }

  const hasProblems = MODULES.some((m) => !status[m.key].ok);

  return (
    <div className="space-y-4">
      {/* Resumo geral */}
      <div className={cn(
        "flex items-center gap-3 rounded-lg border p-4",
        hasProblems ? "border-baron-yellow/30 bg-baron-yellow/5" : "border-baron-green/30 bg-baron-green/5"
      )}>
        {hasProblems ? (
          <AlertTriangle className="h-6 w-6 text-baron-yellow shrink-0" />
        ) : (
          <CheckCircle2 className="h-6 w-6 text-baron-green shrink-0" />
        )}
        <div>
          <p className="text-title text-base font-semibold">
            {hasProblems ? "Atenção necessária" : "Tudo operacional"}
          </p>
          <p className="text-sm text-secondary-info">
            {hasProblems
              ? "Existem pendências que precisam da sua atenção."
              : "Todos os módulos estão funcionando normalmente."}
          </p>
        </div>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MODULES.map((m) => {
          const s = status[m.key];
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => navigate(m.route)}
              className={cn(
                "group flex items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200 hover:bg-card-hover",
                s.ok
                  ? "border-baron-green/20 bg-baron-green/5"
                  : "border-baron-red/20 bg-baron-red/5"
              )}
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                s.ok ? "bg-baron-green/15 text-baron-green" : "bg-baron-red/15 text-baron-red"
              )}>
                {s.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-title text-sm font-semibold">{m.label}</p>
                <p className={cn(
                  "truncate text-xs",
                  s.ok ? "text-baron-green" : "text-baron-red"
                )}>
                  {s.ok ? "OK" : s.alert}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-info opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </div>
  );
}