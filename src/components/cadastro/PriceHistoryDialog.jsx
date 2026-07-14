import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatBRL } from "@/lib/masterData";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingDown, TrendingUp, Plus, History } from "lucide-react";

export default function PriceHistoryDialog({ open, onClose, product, suppliers }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", price: "", quantity: "", date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    if (open && product) {
      setLoading(true);
      base44.entities.PriceHistory.filter({ product_id: product.id }, "-date", 200).then((r) => {
        setHistory(r);
        setLoading(false);
      });
      setForm({ supplier_id: product.primary_supplier_id || "", price: "", quantity: "", date: new Date().toISOString().slice(0, 10) });
    }
  }, [open, product]);

  if (!product) return null;

  const prices = history.map((h) => h.price).filter((p) => p != null);
  const latest = history[0];
  const lowest = prices.length ? Math.min(...prices) : 0;
  const highest = prices.length ? Math.max(...prices) : 0;
  const uniqueSuppliers = new Set(history.map((h) => h.supplier_id)).size;

  const addEntry = async () => {
    if (!form.supplier_id || !form.price) return;
    setAdding(true);
    const supplier = suppliers.find((s) => s.id === form.supplier_id);
    await base44.entities.PriceHistory.create({
      product_id: product.id,
      product_name: product.name,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      price: parseFloat(form.price),
      quantity: parseFloat(form.quantity) || 0,
      unit: product.unit || "un",
      date: form.date,
      user_name: user?.full_name || "Sistema",
    });
    const r = await base44.entities.PriceHistory.filter({ product_id: product.id }, "-date", 200);
    setHistory(r);
    setForm({ supplier_id: "", price: "", quantity: "", date: new Date().toISOString().slice(0, 10) });
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Preços — {product.name}
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-small-info">Último Preço</p>
            <p className="mt-1 text-sm font-semibold text-primary-info">{latest ? formatBRL(latest.price) : "—"}</p>
            <p className="text-xs text-muted-foreground">{latest?.date ? new Date(latest.date).toLocaleDateString("pt-BR") : ""}</p>
          </div>
          <div className="rounded-xl border border-baron-green/30 bg-baron-green/10 p-3">
            <div className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-baron-green" /><p className="text-xs text-baron-green">Menor Preço</p></div>
            <p className="mt-1 text-sm font-semibold text-baron-green">{lowest ? formatBRL(lowest) : "—"}</p>
          </div>
          <div className="rounded-xl border border-baron-red/30 bg-baron-red/10 p-3">
            <div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-baron-red" /><p className="text-xs text-baron-red">Maior Preço</p></div>
            <p className="mt-1 text-sm font-semibold text-baron-red">{highest ? formatBRL(highest) : "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-small-info">Fornecedores</p>
            <p className="mt-1 text-sm font-semibold text-primary-info">{uniqueSuppliers}</p>
          </div>
        </div>

        {/* Manual entry */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium text-primary-info">Registrar Preço</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="col-span-2 sm:col-span-1">
              <Label>Fornecedor</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="mt-1.5" placeholder="0,00" />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="mt-1.5" placeholder="0" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1.5" />
            </div>
            <div className="flex items-end">
              <Button onClick={addEntry} disabled={adding || !form.supplier_id || !form.price} className="w-full gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
            </div>
          </div>
        </div>

        {/* History table */}
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-table-row" />)}</div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-sm text-small-info">Nenhum registro de preço ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-small-info">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-small-info">Fornecedor</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-small-info">Preço</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-small-info">Qtd</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-small-info">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-table-border">
                {history.map((h) => (
                  <tr key={h.id} className={h.price === lowest ? "bg-baron-green/10" : ""}>
                    <td className="px-4 py-2 text-primary-info">{h.date ? new Date(h.date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-2 text-primary-info">{h.supplier_name}</td>
                    <td className="px-4 py-2 text-right font-medium text-primary-info">{formatBRL(h.price)}</td>
                    <td className="px-4 py-2 text-right text-small-info">{h.quantity} {h.unit}</td>
                    <td className="px-4 py-2 text-small-info">{h.user_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}