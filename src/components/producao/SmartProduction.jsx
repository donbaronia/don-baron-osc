import React, { useEffect, useState } from "react";
import { PE, brl } from "@/lib/productionEngine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, ChefHat, AlertCircle, CheckCircle, Package } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const urgencyColor = { critica: "bg-rose-50 border-rose-200 text-rose-700", alta: "bg-orange-50 border-orange-200 text-orange-700", media: "bg-amber-50 border-amber-200 text-amber-700", baixa: "bg-blue-50 border-blue-200 text-blue-700" };

export default function SmartProduction() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setSuggestions(await PE.getSuggestions()); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Sugestões de Produção Inteligente</h3>
          <p className="text-sm text-neutral-500">{suggestions.length} sugest(ão)ões baseadas em consumo, estoque e receitas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCsv("sugestoes_producao.csv", suggestions)} className="gap-2">Exportar</Button>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <ChefHat className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhuma sugestão de produção no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((sug, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-neutral-900">{sug.recipe_name}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyColor[sug.urgency]}`}>{sug.urgency}</span>
                    <span className="text-xs text-neutral-400 capitalize">· {(sug.production_center || "geral").replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-neutral-400">Estoque Atual</span><p className="font-medium text-neutral-700">{sug.current_stock} {sug.unit}</p></div>
                    <div><span className="text-neutral-400">Consumo/dia</span><p className="font-medium text-neutral-700">{sug.avg_daily_consumption.toFixed(1)}</p></div>
                    <div><span className="text-neutral-400">Cobertura</span><p className="font-medium text-neutral-700">{sug.coverage_days}d</p></div>
                  </div>
                  {!sug.can_produce && sug.missing_ingredients.length > 0 && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-rose-50 p-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-rose-700">
                        <span className="font-medium">Ingredientes insuficientes:</span>
                        {sug.missing_ingredients.map((m, j) => <span key={j} className="ml-1">{m.name} ({m.available}/{m.needed}),</span>)}
                      </div>
                    </div>
                  )}
                  {sug.can_produce && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-4 w-4" /> Ingredientes disponíveis</div>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Sugerido</p>
                    <p className="text-lg font-bold text-neutral-900">{sug.suggested_qty} {sug.unit}</p>
                    <p className="text-xs text-neutral-400">{brl(sug.estimated_cost)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}