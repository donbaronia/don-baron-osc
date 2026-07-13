import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { brl } from "@/lib/financialCenter";
import { Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export default function MorningMissions() {
  const [missions, setMissions] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 200).catch(() => []),
      base44.entities.Product.filter({ active: true, status: "ativo", controls_stock: { $ne: false } }, "-stock_quantity", 300).catch(() => []),
      base44.entities.ProductionRecord.filter({ status: { $in: ["planejada", "em_producao", "pausada"] } }, "-created_date", 50).catch(() => []),
      base44.entities.Courier.filter({ status: { $in: ["ativo", "em_entrega"] } }, "-created_date", 50).catch(() => []),
    ]).then(([payments, products, production, couriers]) => {
      const urgent = [];
      const important = [];

      const vencidos = payments.filter((p) => p.due_date && p.due_date < today);
      const vencemHoje = payments.filter((p) => p.due_date === today);
      if (vencidos.length > 0) urgent.push({ text: `${vencidos.length} boleto(s) vencido(s) — ${brl(vencidos.reduce((a, p) => a + (p.amount || 0), 0))}`, route: "/financeiro" });
      if (vencemHoje.length > 0) urgent.push({ text: `${vencemHoje.length} boleto(s) vence(m) hoje — ${brl(vencemHoje.reduce((a, p) => a + (p.amount || 0), 0))}`, route: "/financeiro" });

      const lowStock = products.filter((p) => (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0));
      const zeroStock = lowStock.filter((p) => (p.stock_quantity || 0) <= 0);
      const low = lowStock.filter((p) => (p.stock_quantity || 0) > 0);
      if (zeroStock.length > 0) urgent.push({ text: `${zeroStock.length} produto(s) em falta: ${zeroStock.slice(0, 3).map((p) => p.short_name || p.name).join(", ")}`, route: "/estoque" });
      if (low.length > 0) important.push({ text: `${low.length} produto(s) abaixo do mínimo`, route: "/estoque" });

      if (production.length > 0) important.push({ text: `${production.length} produção(ões) pendente(s)`, route: "/producao" });

      const noCheckin = couriers.filter((c) => !c.last_checkin_at || !c.last_checkin_at.startsWith(today));
      if (noCheckin.length > 0 && couriers.length > 0) important.push({ text: `${noCheckin.length} motoboy(s) sem check-in hoje`, route: "/motoboys" });

      setMissions({ urgent, important });
    });
  }, []);

  if (!missions) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Identificando exceções...
      </div>
    );
  }

  const { urgent, important } = missions;
  const hasAnything = urgent.length > 0 || important.length > 0;

  if (!hasAnything) {
    return (
      <div className="flex items-center gap-2 text-sm text-baron-success">
        <CheckCircle2 className="h-4 w-4" />
        <span>🟢 Todo o restante está em ordem.</span>
      </div>
    );
  }

  const Group = ({ items, emoji, label, groupKey }) => {
    if (items.length === 0) return null;
    const isOpen = expanded === groupKey;
    return (
      <div className="space-y-1">
        <button
          onClick={() => setExpanded(isOpen ? null : groupKey)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
        >
          <span className="shrink-0">{emoji}</span>
          <span className="font-medium text-foreground">{items.length} {label}</span>
          {isOpen ? <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        {isOpen && (
          <div className="ml-6 space-y-0.5">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.route)}
                className="block w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                • {item.text}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      <Group items={urgent} emoji="🔴" label="tarefas urgentes" groupKey="urgent" />
      <Group items={important} emoji="🟡" label="tarefas importantes" groupKey="important" />
      {urgent.length === 0 && important.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-baron-success">
          <CheckCircle2 className="h-4 w-4" />
          <span>🟢 Todo o restante está em ordem.</span>
        </div>
      )}
    </div>
  );
}