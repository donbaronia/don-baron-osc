import React, { useEffect, useState } from "react";
import { IE, brl } from "@/lib/inventoryEngine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { exportToCsv } from "@/lib/exportCsv";

const urgencyColor = { critica: "bg-rose-50 border-rose-200 text-rose-700", alta: "bg-orange-50 border-orange-200 text-orange-700", media: "bg-amber-50 border-amber-200 text-amber-700", baixa: "bg-blue-50 border-blue-200 text-blue-700" };

export default function SmartSuggestions() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, forecast] = await Promise.all([
        IE.getOperationalDashboard(),
      ]);
      setData(dash);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;

  const suggestions = data.suggestedPurchases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Compras Inteligentes Sugeridas</h3>
          <p className="text-sm text-neutral-500">{suggestions.length} sugest(ão)ões baseadas em consumo, cobertura e lead time</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCsv("compras_sugeridas.csv", suggestions)} className="gap-2">Exportar</Button>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <ShoppingCart className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhuma compra sugerida no momento. Todos os estoques estão em níveis adequados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((sug, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-neutral-900">{sug.product_name}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyColor[sug.urgency]}`}>{sug.urgency}</span>
                    {sug.supplier_name && <span className="text-xs text-neutral-400">· {sug.supplier_name}</span>}
                  </div>
                  <p className="text-sm text-neutral-500">{sug.reason}</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-neutral-400">Atual</span><p className="font-medium text-neutral-700">{sug.current_qty} {sug.unit}</p></div>
                    <div><span className="text-neutral-400">Consumo/dia</span><p className="font-medium text-neutral-700">{sug.avg_daily_consumption.toFixed(1)}</p></div>
                    <div><span className="text-neutral-400">Cobertura</span><p className="font-medium text-neutral-700">{sug.coverage_days}d</p></div>
                    <div><span className="text-neutral-400">Lead Time</span><p className="font-medium text-neutral-700">{sug.lead_time_days}d</p></div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Sugestão</p>
                    <p className="text-lg font-bold text-neutral-900">{sug.suggested_qty} {sug.unit}</p>
                    <p className="text-xs text-neutral-400">{brl(sug.estimated_cost)}</p>
                  </div>
                  <Link to="/compras"><Button size="sm" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Criar</Button></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}