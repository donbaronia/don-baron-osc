import React, { useEffect, useState } from "react";
import { IE, brl } from "@/lib/inventoryEngine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, AlertTriangle, Calendar, Package } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const ALERT_LEVELS = [
  { key: "vencido", label: "Vencido", color: "border-rose-200 bg-rose-50", badge: "bg-rose-600 text-white", text: "text-rose-700" },
  { key: "alerta_1", label: "1 Dia", color: "border-rose-200 bg-rose-50", badge: "bg-rose-500 text-white", text: "text-rose-700" },
  { key: "alerta_3", label: "3 Dias", color: "border-orange-200 bg-orange-50", badge: "bg-orange-500 text-white", text: "text-orange-700" },
  { key: "alerta_7", label: "7 Dias", color: "border-amber-200 bg-amber-50", badge: "bg-amber-500 text-white", text: "text-amber-700" },
  { key: "alerta_15", label: "15 Dias", color: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-500 text-white", text: "text-yellow-700" },
  { key: "alerta_30", label: "30 Dias", color: "border-blue-200 bg-blue-50", badge: "bg-blue-500 text-white", text: "text-blue-700" },
  { key: "alerta_60", label: "60 Dias", color: "border-blue-200 bg-blue-50", badge: "bg-blue-400 text-white", text: "text-blue-700" },
];

export default function BatchExpiryControl() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await IE.getExpiryAlerts()); }
    catch (e) { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;

  const totalCount = ALERT_LEVELS.reduce((s, l) => s + (data[l.key]?.length || 0), 0);
  const totalValue = ALERT_LEVELS.reduce((s, l) => s + (data[l.key] || []).reduce((s2, i) => s2 + (i.total_value || 0), 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div><span className="text-xs text-neutral-500">Total de Lotes com Alerta</span><p className="text-lg font-bold text-neutral-900">{totalCount}</p></div>
          <div><span className="text-xs text-neutral-500">Valor em Risco</span><p className="text-lg font-bold text-rose-600">{brl(totalValue)}</p></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCsv("validades.csv", ALERT_LEVELS.flatMap(l => (data[l.key] || []).map(i => ({ ...i, alert_level: l.label }))))} className="gap-2">Exportar CSV</Button>
      </div>

      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Calendar className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhum lote com alerta de validade</p>
        </div>
      )}

      {ALERT_LEVELS.map(level => {
        const items = data[level.key] || [];
        if (items.length === 0) return null;
        return (
          <div key={level.key} className={`rounded-2xl border ${level.color} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${level.badge}`}>{level.label}</span>
              <span className={`text-sm font-semibold ${level.text}`}>{items.length} lote(s)</span>
              <span className={`text-xs ${level.text}`}>· Valor: {brl(items.reduce((s, i) => s + (i.total_value || 0), 0))}</span>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/70 p-2 text-sm">
                  <div>
                    <span className="font-medium text-neutral-900">{item.product_name}</span>
                    <span className="ml-2 text-xs text-neutral-400">Lote: {item.batch_number || "—"}</span>
                    {item.supplier_name && <span className="ml-2 text-xs text-neutral-400">{item.supplier_name}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-neutral-500">{item.quantity} {item.unit}</span>
                    <span className="text-xs text-neutral-500">Validade: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("pt-BR") : "—"}</span>
                    <span className="font-medium text-neutral-900">{brl(item.total_value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}