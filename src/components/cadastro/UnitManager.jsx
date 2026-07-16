import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Ruler, Pencil, Check, X } from "lucide-react";

export default function UnitManager() {
  const [units, setUnits] = useState([]);
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAbbr, setEditAbbr] = useState("");

  const load = async () => {
    setUnits(await base44.entities.UnitOfMeasure.list("name", 200));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim() || !abbr.trim()) return;
    await base44.entities.UnitOfMeasure.create({ name: name.trim(), abbreviation: abbr.trim() });
    setName(""); setAbbr("");
    load();
  };

  const remove = async (unit) => {
    if (!confirm(`Excluir unidade "${unit.name}"?`)) return;
    await base44.entities.UnitOfMeasure.delete(unit.id);
    load();
  };

  const startEdit = (u) => { setEditingId(u.id); setEditName(u.name); setEditAbbr(u.abbreviation); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (u) => {
    if (!editName.trim() || !editAbbr.trim()) return;
    await base44.entities.UnitOfMeasure.update(u.id, { name: editName.trim(), abbreviation: editAbbr.trim() });
    setEditingId(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex: Quilograma)" className="max-w-xs" />
        <Input value={abbr} onChange={(e) => setAbbr(e.target.value)} placeholder="Abreviação (ex: kg)" className="max-w-[160px]" />
        <Button onClick={add} className="gap-2 bg-neutral-900 hover:bg-neutral-800"><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : units.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma unidade cadastrada.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
              {editingId === u.id ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" autoFocus />
                  <Input value={editAbbr} onChange={(e) => setEditAbbr(e.target.value)} className="h-8 w-20 text-sm" />
                  <button onClick={() => saveEdit(u)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-neutral-900">{u.name}</span>
                    <span className="text-xs text-neutral-400">({u.abbreviation})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(u)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(u)} className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
