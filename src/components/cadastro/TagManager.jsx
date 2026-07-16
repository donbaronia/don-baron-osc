import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Tag, Pencil, Check, X } from "lucide-react";

export default function TagManager() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

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

  const startEdit = (t) => { setEditingId(t.id); setEditName(t.name); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (t) => {
    if (!editName.trim()) return;
    await base44.entities.Tag.update(t.id, { name: editName.trim() });
    setEditingId(null);
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
            editingId === t.id ? (
              <div key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(t)} className="h-6 w-28 text-xs" autoFocus />
                <button onClick={() => saveEdit(t)} className="rounded-full p-0.5 text-emerald-600 hover:bg-emerald-100"><Check className="h-3 w-3" /></button>
                <button onClick={cancelEdit} className="rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <div key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700">
                <Tag className="h-3.5 w-3.5 text-amber-500" />
                {t.name}
                <button onClick={() => startEdit(t)} className="ml-1 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => remove(t)} className="rounded-full p-0.5 text-neutral-400 hover:bg-rose-100 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
