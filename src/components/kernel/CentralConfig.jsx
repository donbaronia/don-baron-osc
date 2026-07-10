import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel } from "@/lib/kernelEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const CONFIG_CATEGORIES = ["empresa", "sistema", "ia", "alertas", "smtp", "pix", "integracoes", "notificacoes", "backup", "seguranca", "tema"];

export default function CentralConfig({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ key: "", value: "", category: "sistema", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.getCentralConfig();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCreate = async () => {
    if (!form.key) {
      toast({ title: "Informe a chave", variant: "destructive" });
      return;
    }
    try {
      await BaronKernel.updateCentralConfig(form.key, { value: form.value }, form.category, form.description);
      toast({ title: "Configuração salva" });
      setDialogOpen(false);
      setForm({ key: "", value: "", category: "sistema", description: "" });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} configuração(ões)</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Nova Configuração</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Settings2 className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhuma configuração registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                <Settings2 className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800">{c.key}</span>
                  <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{c.category}</span>
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  {c.description || JSON.stringify(c.value).substring(0, 60)}
                </p>
              </div>
              <span className="text-xs text-neutral-400">{c.updated_by_name || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDialogOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">Nova Configuração</h3>
            <div className="space-y-3">
              <div>
                <Label>Chave</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="empresa.nome, ia.modelo" />
              </div>
              <div>
                <Label>Valor</Label>
                <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Valor da configuração" />
              </div>
              <div>
                <Label>Categoria</Label>
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CONFIG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" />
              </div>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}