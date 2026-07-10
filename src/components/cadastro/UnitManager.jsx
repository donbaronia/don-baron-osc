import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Ruler } from "lucide-react";

export default function UnitManager() {
  const [units, setUnits] = useState([]);
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [loading, setLoading] = useState(true);

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
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-neutral-900">{u.name}</span>
                <span className="text-xs text-neutral-400">({u.abbreviation})</span>
              </div>
              <button onClick={() => remove(u)} className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}