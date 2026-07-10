import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Tag } from "lucide-react";

export default function TagManager() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setTags(await base44.entities.Tag.list("name", 200));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    await base44.entities.Tag.create({ name: name.trim() });
    setName("");
    load();
  };

  const remove = async (tag) => {
    if (!confirm(`Excluir tag "${tag.name}"?`)) return;
    await base44.entities.Tag.delete(tag.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nova tag..." className="max-w-sm" />
        <Button onClick={add} className="gap-2 bg-neutral-900 hover:bg-neutral-800"><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : tags.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma tag cadastrada.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700">
              <Tag className="h-3.5 w-3.5 text-amber-500" />
              {t.name}
              <button onClick={() => remove(t)} className="ml-1 rounded-full p-0.5 text-neutral-400 hover:bg-rose-100 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}