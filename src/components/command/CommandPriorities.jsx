import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { brl } from "@/lib/financialCenter";
import { ChevronRight, CheckCircle2 } from "lucide-react";

const MODULES = [
  { key: "financeiro", emoji: "🔴", label: "Financeiro", route: "/financeiro", accent: "border-red-500/30 bg-red-500/5" },
  { key: "estoque", emoji: "🟡", label: "Estoque & Compras", route: "/estoque", accent: "border-amber-500/30 bg-amber-500/5" },
  { key: "producao", emoji: "🟢", label: "Produção", route: "/producao", accent: "border-emerald-500/30 bg-emerald-500/5" },
  { key: "delivery", emoji: "🔵", label: "Delivery", route: "/motoboys", accent: "border-blue-500/30 bg-blue-500/5" },
  { key: "rh", emoji: "🟣", label: "RH", route: "/rh", accent: "border-violet-500/30 bg-violet-500/5" },
  { key: "intelligence", emoji: "🟠", label: "Intelligence", route: "/indicadores", accent: "border-orange-500/30 bg-orange-500/5" },
];

export default function CommandPriorities() {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";

    Promise.all([
      base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 200).catch(() => []),
      base44.entities.Product.filter({ active: true }, "-created_date", 300).catch(() => []),
      base44.entities.ProductionRecord.list("-created_date", 100).catch(() => []),
      base44.entities.Courier.filter({ status: { $in: ["ativo", "em_entrega"] } }, "-created_date", 100).catch(() => []),
      base44.entities.Employee.filter({}, "-created_date", 200).then((list) => list.filter((e) => e.status !== "demitido" && e.status !== "inativo")).catch(() => []),
      base44.entities.Sale.list("-created_date", 100).catch(() => []),
      base44.entities.DBDocument.filter({ status: "aguardando_confirmacao" }, "-created_date", 50).catch(() => []),
    ]).then(([payments, products, production, couriers, employees, sales, pendingDocs]) => {
      const s = {};

      // 🔴 Financeiro
      const vencidos = payments.filter(p => p.due_date && p.due_date < today);
      const vencemHoje = payments.filter(p => p.due_date === today);
      const vencemAmanha = payments.filter(p => p.due_date === today.slice(0, 8) + (Number(today.slice(8)) + 1).padStart(2, "0"));
      const totalPagar = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const finItems = [];
      if (vencidos.length > 0) finItems.push({ text: `${vencidos.length} boleto(s) vencido(s) — ${brl(vencidos.reduce((a, p) => a + (p.amount || 0), 0))}`, priority: "critica" });
      if (vencemHoje.length > 0) finItems.push({ text: `${vencemHoje.length} boleto(s) vencem hoje — ${brl(vencemHoje.reduce((a, p) => a + (p.amount || 0), 0))}`, priority: "critica" });
      if (vencemAmanha.length > 0) finItems.push({ text: `${vencemAmanha.length} boleto(s) vencem amanhã`, priority: "alta" });
      if (totalPagar > 0) finItems.push({ text: `Total a pagar (pendente): ${brl(totalPagar)}`, priority: "info" });
      if (pendingDocs.filter(d => d.category === "boleto").length > 0) finItems.push({ text: `${pendingDocs.filter(d => d.category === "boleto").length} boleto(s) aguardando conferência`, priority: "media", route: "/processamento" });
      s.financeiro = { items: finItems, ok: finItems.length === 0, okMsg: "Sem boletos pendentes no momento." };

      // 🟡 Estoque & Compras
      const lowStock = products.filter(p => p.controls_stock !== false && (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0));
      const zeroStock = lowStock.filter(p => (p.stock_quantity || 0) <= 0);
      const stockItems = [];
      if (zeroStock.length > 0) stockItems.push({ text: `${zeroStock.length} produto(s) em falta: ${zeroStock.slice(0, 3).map(p => p.short_name || p.name).join(", ")}${zeroStock.length > 3 ? "..." : ""}`, priority: "critica" });
      if (lowStock.length > zeroStock.length) stockItems.push({ text: `${lowStock.length - zeroStock.length} produto(s) abaixo do mínimo`, priority: "alta" });
      if (pendingDocs.filter(d => d.category === "nota_fiscal").length > 0) {
        const nfPend = pendingDocs.filter(d => d.category === "nota_fiscal");
        stockItems.push({ text: `${nfPend.length} nota(s) fiscal(is) aguardando aprovação`, priority: "media", route: "/processamento" });
      }
      s.estoque = { items: stockItems, ok: stockItems.length === 0, okMsg: "Estoque abastecido. Tudo no prazo." };

      // 🟢 Produção
      const pendentes = production.filter(p => p.status === "planejada" || p.status === "em_producao" || p.status === "pausada");
      const concluidasHoje = production.filter(p => p.status === "concluida" && p.production_date === today);
      const prodItems = [];
      if (pendentes.length > 0) prodItems.push({ text: `${pendentes.length} produção(ões) pendente(s): ${pendentes.slice(0, 3).map(p => p.item).join(", ")}`, priority: pendentes.length > 3 ? "alta" : "media" });
      if (concluidasHoje.length > 0) prodItems.push({ text: `${concluidasHoje.length} produção(ões) concluída(s) hoje`, priority: "info" });
      s.producao = { items: prodItems, ok: prodItems.length === 0, okMsg: "Todos os itens da produção estão completos." };

      // 🔵 Delivery
      const ativos = couriers.filter(c => c.status === "ativo" || c.status === "em_entrega");
      const emEntrega = couriers.filter(c => c.status === "em_entrega");
      const checkinsHoje = couriers.filter(c => c.last_checkin_at && c.last_checkin_at.startsWith(today));
      const pixPendente = couriers.filter(c => (c.pending_payment || 0) > 0);
      const delItems = [];
      if (ativos.length > 0) delItems.push({ text: `${ativos.length} motoboy(s) ativo(s)${emEntrega.length > 0 ? `, ${emEntrega.length} em entrega` : ""}`, priority: "info" });
      if (checkinsHoje.length > 0) delItems.push({ text: `${checkinsHoje.length} motoboy(s) fizeram check-in hoje`, priority: "info" });
      if (pixPendente.length > 0) delItems.push({ text: `${pixPendente.length} motoboy(s) com PIX pendente — ${brl(pixPendente.reduce((a, c) => a + (c.pending_payment || 0), 0))}`, priority: "alta" });
      s.delivery = { items: delItems, ok: delItems.length === 0, okMsg: "Nenhum motoboy cadastrado ainda." };

      // 🟣 RH
      const hoje = new Date();
      const mesAno = `${hoje.getMonth() + 1}`;
      const aniversariantes = employees.filter(e => {
        if (!e.birth_date) return false;
        const [_, mes] = e.birth_date.split("-");
        return mes === mesAno.padStart(2, "0");
      });
      const ferias = employees.filter(e => e.status === "ferias");
      const afastados = employees.filter(e => e.status === "afastado");
      const rhItems = [];
      if (afastados.length > 0) rhItems.push({ text: `${afastados.length} funcionário(s) afastado(s)`, priority: "media" });
      if (ferias.length > 0) rhItems.push({ text: `${ferias.length} funcionário(s) de férias`, priority: "info" });
      if (aniversariantes.length > 0) rhItems.push({ text: `${aniversariantes.length} aniversário(s) este mês: ${aniversariantes.slice(0, 3).map(e => e.short_name || e.full_name?.split(" ")[0]).join(", ")}`, priority: "info" });
      if (rhItems.length === 0 && employees.length > 0) rhItems.push({ text: "Nenhum funcionário ausente. Equipe completa.", priority: "info" });
      s.rh = { items: rhItems, ok: rhItems.length === 0, okMsg: "Nenhum funcionário cadastrado ainda." };

      // 🟠 Intelligence
      const salesMonth = sales.filter(s => (s.created_date || "").startsWith(today.slice(0, 7)));
      const fatOntem = sales.filter(s => (s.created_date || "").startsWith(yStr)).reduce((a, s) => a + (s.total || s.amount || 0), 0);
      const fatMes = salesMonth.reduce((a, s) => a + (s.total || s.amount || 0), 0);
      const intItems = [];
      if (fatMes > 0) intItems.push({ text: `Faturamento do mês: ${brl(fatMes)}`, priority: "info" });
      if (fatOntem > 0) intItems.push({ text: `Faturamento de ontem: ${brl(fatOntem)}`, priority: "info" });
      if (salesMonth.length > 0) {
        const media = fatMes / hoje.getDate();
        intItems.push({ text: `Média diária: ${brl(media)} (${salesMonth.length} vendas)`, priority: "info" });
      }
      s.intelligence = { items: intItems, ok: intItems.length === 0, okMsg: "Aguardando dados de vendas para análise." };

      setSections(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  const totalAssuntos = Object.values(sections).reduce((s, sec) => s + (sec.items?.filter(i => i.priority !== "info").length || 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {totalAssuntos > 0 ? `Hoje encontrei ${totalAssuntos} assunto(s) importante(s)` : "Operação estável — tudo sob controle"}
      </p>
      <div className="space-y-2.5">
        {MODULES.map(mod => {
          const sec = sections[mod.key];
          if (!sec) return null;
          const priorityItems = sec.items.filter(i => i.priority !== "info");
          const hasUrgent = sec.items.some(i => i.priority === "critica");
          return (
            <button
              key={mod.key}
              onClick={() => navigate(mod.route)}
              className={`block w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/30 ${mod.accent}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{mod.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                  {hasUrgent && <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">Crítico</span>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              {sec.ok ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-baron-success" />
                  <span>{sec.okMsg}</span>
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  {sec.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.priority === "critica" ? "bg-red-500" :
                        item.priority === "alta" ? "bg-orange-500" :
                        item.priority === "media" ? "bg-amber-500" :
                        "bg-blue-400"
                      }`} />
                      <span className={item.priority === "critica" ? "font-medium text-foreground" : "text-muted-foreground"}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}