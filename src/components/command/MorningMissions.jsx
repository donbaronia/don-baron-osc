import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { brl } from "@/lib/financialCenter";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function MorningMissions() {
  const [missions, setMissions] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 200).catch(() => []),
      base44.entities.Product.filter({ active: true, status: "ativo", controls_stock: { $ne: false } }, "-stock_quantity", 300).catch(() => []),
      base44.entities.ProductionRecord.filter({ status: { $in: ["planejada", "em_producao", "pausada"] } }, "-created_date", 50).catch(() => []),
      base44.entities.Courier.filter({ status: { $in: ["ativo", "em_entrega"] } }, "-created_date", 50).catch(() => []),
    ]).then(([payments, products, production, couriers]) => {
      const list = [];

      // Boletos vencidos
      const vencidos = payments.filter((p) => p.due_date && p.due_date < today);
      if (vencidos.length > 0) {
        list.push({ priority: "urgent", emoji: "🔴", text: `${vencidos.length} boleto(s) vencido(s) — ${brl(vencidos.reduce((a, p) => a + (p.amount || 0), 0))}`, route: "/financeiro" });
      }
      // Boletos vencem hoje
      const vencemHoje = payments.filter((p) => p.due_date === today);
      if (vencemHoje.length > 0) {
        list.push({ priority: "urgent", emoji: "🔴", text: `${vencemHoje.length} boleto(s) vence(m) hoje — ${brl(vencemHoje.reduce((a, p) => a + (p.amount || 0), 0))}`, route: "/financeiro" });
      }

      // Estoque baixo
      const lowStock = products.filter((p) => (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0));
      if (lowStock.length > 0) {
        const zeroStock = lowStock.filter((p) => (p.stock_quantity || 0) <= 0);
        if (zeroStock.length > 0) list.push({ priority: "urgent", emoji: "🔴", text: `${zeroStock.length} produto(s) em falta: ${zeroStock.slice(0, 2).map((p) => p.short_name || p.name).join(", ")}`, route: "/estoque" });
        const low = lowStock.filter((p) => (p.stock_quantity || 0) > 0);
        if (low.length > 0) list.push({ priority: "important", emoji: "🟡", text: `${low.length} produto(s) abaixo do mínimo`, route: "/estoque" });
      }

      // Produção pendente
      if (production.length > 0) {
        list.push({ priority: "important", emoji: "🟡", text: `${production.length} produção(ões) pendente(s)`, route: "/producao" });
      }

      // Motoboy sem check-in hoje
      const noCheckin = couriers.filter((c) => !c.last_checkin_at || !c.last_checkin_at.startsWith(today));
      if (noCheckin.length > 0 && couriers.length > 0) {
        list.push({ priority: "important", emoji: "🟡", text: `${noCheckin.length} motoboy(s) sem check-in hoje`, route: "/motoboys" });
      }

      setMissions(list);
    });
  }, []);

  if (!missions) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Identificando o que precisa de atenção...
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-baron-success">
        <CheckCircle2 className="h-4 w-4" />
        <span>🟢 Todo o restante está em ordem.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {missions.map((m, i) => (
        <button
          key={i}
          onClick={() => navigate(m.route)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
        >
          <span className="shrink-0">{m.emoji}</span>
          <span className={m.priority === "urgent" ? "font-medium text-foreground" : "text-muted-foreground"}>{m.text}</span>
        </button>
      ))}
    </div>
  );
}