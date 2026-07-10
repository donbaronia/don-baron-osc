import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PC, brl } from "@/lib/purchasingCenter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Search, TrendingUp, TrendingDown, History, RefreshCw } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function PriceHistoryView() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    const prods = await base44.entities.Product.filter({ active: true }, "name", 500).catch(() => []);
    setProducts(prods);
  };
  useEffect(() => { loadProducts(); }, []);

  const loadHistory = async (product) => {
    setSelectedProduct(product);
    setLoading(true);
    try {
      const h = await PC.getProductPriceHistory(product.name, product.id);
      setHistory(h);
    } catch { toast({ title: "Erro", description: "Falha ao carregar histórico", variant: "destructive" }); }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product list */}
      <div className="lg:col-span-1 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9 bg-white" />
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-1 rounded-xl border border-neutral-200 bg-white p-2">
          {filteredProducts.slice(0, 100).map(p => (
            <button key={p.id} onClick={() => loadHistory(p)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedProduct?.id === p.id ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>
              {p.name}
            </button>
          ))}
          {filteredProducts.length === 0 && <p className="py-4 text-center text-xs text-neutral-400">Nenhum produto</p>}
        </div>
      </div>

      {/* History detail */}
      <div className="lg:col-span-2">
        {!selectedProduct ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <History className="h-10 w-10 mb-2" />
            <p className="text-sm">Selecione um produto para ver o histórico de preços</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>
        ) : !history ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <p className="text-sm">Nenhum histórico de preço para este produto</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900">{selectedProduct.name}</h3>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("historico_preco.csv", history.history)} className="gap-2">Exportar</Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs text-neutral-500">Último Preço</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{brl(history.lastPurchase?.price)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs text-neutral-500">Menor Preço</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">{brl(history.minPrice)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs text-neutral-500">Maior Preço</p>
                <p className="mt-1 text-lg font-bold text-rose-600">{brl(history.maxPrice)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs text-neutral-500">Preço Médio</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{brl(history.avgPrice)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-xs text-neutral-500">Média 30 dias</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{brl(history.last30Avg)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-xs text-neutral-500">Média 90 dias</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{brl(history.last90Avg)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-xs text-neutral-500">Média 180 dias</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{brl(history.last180Avg)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-xs text-neutral-500">Média 365 dias</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{brl(history.last365Avg)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">Histórico de Compras ({history.count})</h4>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {[...history.history].reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-neutral-50 pb-2 text-sm">
                    <div>
                      <span className="text-neutral-700">{h.supplier_name || "—"}</span>
                      <span className="ml-2 text-xs text-neutral-400">{h.date ? new Date(h.date).toLocaleDateString("pt-BR") : "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400">{h.quantity} {h.unit || ""}</span>
                      <span className="font-medium text-neutral-900">{brl(h.price)}</span>
                    </div>
                  </div>
                ))}
                {history.history.length === 0 && <p className="py-2 text-center text-xs text-neutral-400">Sem registros</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}