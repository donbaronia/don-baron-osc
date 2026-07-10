import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Folder } from "lucide-react";

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setCategories(await base44.entities.Category.list("name", 300));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    await base44.entities.Category.create({ name: name.trim() });
    setName("");
    load();
  };

  const remove = async (cat) => {
    if (!confirm(`Excluir categoria "${cat.name}"?`)) return;
    await base44.entities.Category.delete(cat.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nova categoria..." className="max-w-sm" />
        <Button onClick={add} className="gap-2 bg-neutral-900 hover:bg-neutral-800"><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-neutral-900">{cat.name}</span>
              </div>
              <button onClick={() => remove(cat)} className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}