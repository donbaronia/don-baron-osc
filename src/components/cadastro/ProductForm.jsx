import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { generateInternalCode } from "@/lib/masterData";
import { logAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Plus, X } from "lucide-react";

const EMPTY = {
  name: "", short_name: "", internal_code: "", barcode: "",
  category: "", subcategory: "", unit: "un", brand: "",
  primary_supplier_id: "", primary_supplier_name: "",
  alternative_supplier_id: "", alternative_supplier_name: "",
  description: "", image_url: "",
  active: true, internally_produced: false,
  controls_stock: true, controls_expiry: false, controls_batch: false, controls_average_cost: true,
  min_quantity: 0, ideal_quantity: 0, max_quantity: 0,
  physical_location: "", notes: "", tags: [], cost_price: 0,
};

function SwitchCard({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
      <div className="pr-3">
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function ProductForm({ open, onClose, product, onSaved, suppliers, categories, units, tags }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (open) {
      setForm(product ? { ...EMPTY, ...product } : { ...EMPTY, internal_code: generateInternalCode() });
      setNewTag("");
    }
  }, [open, product]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const toggle = (key) => setForm((f) => ({ ...f, [key]: !f[key] }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("image_url", file_url);
    setUploading(false);
  };

  const toggleTag = (tagName) => {
    setForm((f) => ({
      ...f, tags: f.tags.includes(tagName) ? f.tags.filter((t) => t !== tagName) : [...f.tags, tagName],
    }));
  };

  const addNewTag = () => {
    const t = newTag.trim();
    if (!t || form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setNewTag("");
  };

  const selectSupplier = (field, supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    const name = supplier?.name || "";
    if (field === "primary") {
      setForm((f) => ({ ...f, primary_supplier_id: supplierId, primary_supplier_name: name }));
    } else {
      setForm((f) => ({ ...f, alternative_supplier_id: supplierId, alternative_supplier_name: name }));
    }
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (product?.id) {
        await base44.entities.Product.update(product.id, form);
        await logAudit({ user, module: "Cadastro Mestre", action: "Editou produto", details: form.name });
      } else {
        await base44.entities.Product.create(form);
        await logAudit({ user, module: "Cadastro Mestre", action: "Criou produto", details: form.name });
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Identificação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5" placeholder="Ex: Hambúrguer Artesanal 180g" />
              </div>
              <div>
                <Label>Nome Curto</Label>
                <Input value={form.short_name} onChange={(e) => set("short_name", e.target.value)} className="mt-1.5" placeholder="Ex: HB180" />
              </div>
              <div>
                <Label>Código Interno</Label>
                <Input value={form.internal_code} onChange={(e) => set("internal_code", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Código de Barras</Label>
                <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} className="mt-1.5" placeholder="Opcional" />
              </div>
            </div>
          </section>

          {/* Classificação */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Classificação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Input value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} className="mt-1.5" placeholder="Opcional" />
              </div>
              <div>
                <Label>Unidade de Medida</Label>
                <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => <SelectItem key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} className="mt-1.5" placeholder="Opcional" />
              </div>
            </div>
          </section>

          {/* Fornecedores */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Fornecedores</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor Principal</Label>
                <Select value={form.primary_supplier_id} onValueChange={(v) => selectSupplier("primary", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor Alternativo</Label>
                <Select value={form.alternative_supplier_id} onValueChange={(v) => selectSupplier("alternative", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Controles */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Controles</h3>
            <div className="grid grid-cols-2 gap-3">
              <SwitchCard label="Produto Ativo" desc="Disponível para uso no sistema" checked={form.active} onChange={() => toggle("active")} />
              <SwitchCard label="Produzido Internamente" desc="Fabricado pela Don Baron" checked={form.internally_produced} onChange={() => toggle("internally_produced")} />
              <SwitchCard label="Controla Estoque" desc="Monitora quantidade em estoque" checked={form.controls_stock} onChange={() => toggle("controls_stock")} />
              <SwitchCard label="Controla Validade" desc="Rastreia data de vencimento" checked={form.controls_expiry} onChange={() => toggle("controls_expiry")} />
              <SwitchCard label="Controla Lote" desc="Rastreia número de lote" checked={form.controls_batch} onChange={() => toggle("controls_batch")} />
              <SwitchCard label="Controla Custo Médio" desc="Calcula custo médio ponderado" checked={form.controls_average_cost} onChange={() => toggle("controls_average_cost")} />
            </div>
          </section>

          {/* Estoque */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Parâmetros de Estoque</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Qtd. Mínima</Label>
                <Input type="number" value={form.min_quantity} onChange={(e) => set("min_quantity", parseFloat(e.target.value) || 0)} className="mt-1.5" />
              </div>
              <div>
                <Label>Qtd. Ideal</Label>
                <Input type="number" value={form.ideal_quantity} onChange={(e) => set("ideal_quantity", parseFloat(e.target.value) || 0)} className="mt-1.5" />
              </div>
              <div>
                <Label>Qtd. Máxima</Label>
                <Input type="number" value={form.max_quantity} onChange={(e) => set("max_quantity", parseFloat(e.target.value) || 0)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Localização Física</Label>
              <Input value={form.physical_location} onChange={(e) => set("physical_location", e.target.value)} className="mt-1.5" placeholder="Ex: Geladeira A - Prateleira 2" />
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = form.tags.includes(tag.name);
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.name)}
                    className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      active ? "bg-amber-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>
                    {tag.name}
                  </button>
                );
              })}
              {form.tags.filter((t) => !tags.some((tag) => tag.name === t)).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white">
                  {t}
                  <button type="button" onClick={() => toggleTag(t)}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewTag())} placeholder="Nova tag..." className="flex-1" />
              <Button type="button" variant="outline" onClick={addNewTag} className="gap-1"><Plus className="h-4 w-4" />Adicionar</Button>
            </div>
          </section>

          {/* Adicionais */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Informações Adicionais</h3>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Imagem do Produto</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:border-neutral-400">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Enviando..." : form.image_url ? "Trocar imagem" : "Enviar imagem"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1.5" rows={2} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name} className="bg-neutral-900 hover:bg-neutral-800">
            {saving ? "Salvando..." : "Salvar Produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}