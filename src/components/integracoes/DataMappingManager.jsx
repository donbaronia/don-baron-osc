import React, { useEffect, useState, useCallback } from "react";
import { IntegrationHub } from "@/lib/integrationHub";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function DataMappingManager({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", source_system: "", entity_type: "", mapping_rules: {} });
  const [rules, setRules] = useState([{ source: "", target: "" }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await IntegrationHub.listMappings();
      setItems(items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCreate = async () => {
    if (!form.name || !form.entity_type) {
      toast({ title: "Preencha nome e tipo de entidade", variant: "destructive" });
      return;
    }
    const mappingRules = {};
    rules.filter((r) => r.source && r.target).forEach((r) => { mappingRules[r.source] = r.target; });

    try {
      await IntegrationHub.createMapping({
        ...form,
        mapping_rules: mappingRules,
        is_template: true,
      });
      toast({ title: "Mapeamento criado" });
      setDialogOpen(false);
      setForm({ name: "", source_system: "", entity_type: "", mapping_rules: {} });
      setRules([{ source: "", target: "" }]);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await IntegrationHub.deleteMapping(id);
      toast({ title: "Mapeamento removido" });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} mapeamento(s)</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Novo Mapeamento</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <ArrowLeftRight className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum mapeamento criado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-neutral-800">{m.name}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {m.source_system || "—"} → Interno · {m.entity_type}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(m.mapping_rules || {}).slice(0, 5).map(([src, tgt]) => (
                      <span key={src} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {src} <ArrowRight className="h-3 w-3" /> {tgt}
                      </span>
                    ))}
                    {Object.keys(m.mapping_rules || {}).length > 5 && (
                      <span className="text-xs text-neutral-400">+{Object.keys(m.mapping_rules).length - 5} mais</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento de Dados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: iFood → Produto Interno" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sistema de Origem</Label>
                <Input value={form.source_system} onChange={(e) => setForm({ ...form, source_system: e.target.value })} placeholder="iFood" />
              </div>
              <div>
                <Label>Tipo de Entidade</Label>
                <Input value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} placeholder="product, supplier..." />
              </div>
            </div>
            <div>
              <Label>Regras de Mapeamento</Label>
              <div className="mt-1 space-y-2">
                {rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input className="flex-1" value={r.source} onChange={(e) => {
                      const newRules = [...rules]; newRules[i].source = e.target.value; setRules(newRules);
                    }} placeholder="campo_origem" />
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                    <Input className="flex-1" value={r.target} onChange={(e) => {
                      const newRules = [...rules]; newRules[i].target = e.target.value; setRules(newRules);
                    }} placeholder="campo_destino" />
                    <Button size="sm" variant="ghost" onClick={() => setRules(rules.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setRules([...rules, { source: "", target: "" }])}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar Regra
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Mapeamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}