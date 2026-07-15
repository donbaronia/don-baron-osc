import React, { useEffect, useState } from "react";
import { EventBus } from "@/lib/eventBus";
import { Input } from "@/components/ui/input";
import { BaronSelect } from "@/design-system";
import { Search, BookOpen } from "lucide-react";

const PRIORITY_CFG = {
  critica: { label: "Crítica", color: "bg-rose-100 text-rose-700" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  media: { label: "Média", color: "bg-blue-100 text-blue-700" },
  baixa: { label: "Baixa", color: "bg-neutral-100 text-neutral-600" },
};

export default function EventCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterQueue, setFilterQueue] = useState("all");

  useEffect(() => {
    EventBus.getCatalog().then(r => { setCatalog(r.catalog || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const modules = [...new Set(catalog.map(e => e.module))].sort();
  const queues = [...new Set(catalog.map(e => e.queue))].sort();

  const filtered = catalog.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.event_type.includes(search.toLowerCase()) && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModule !== "all" && e.module !== filterModule) return false;
    if (filterQueue !== "all" && e.queue !== filterQueue) return false;
    return true;
  });

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="w-[160px]"><BaronSelect value={filterModule} onChange={setFilterModule} options={[{ value: "all", label: "Todos os módulos" }, ...modules.map((m) => ({ value: m, label: m }))]} placeholder="Módulo" /></div>
        <div className="w-[160px]"><BaronSelect value={filterQueue} onChange={setFilterQueue} options={[{ value: "all", label: "Todas as filas" }, ...queues.map((q) => ({ value: q, label: q }))]} placeholder="Fila" /></div>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <BookOpen className="h-4 w-4" /> {filtered.length} de {catalog.length} eventos no catálogo
      </div>

      {/* Catalog List */}
      <div className="space-y-2">
        {filtered.map(e => {
          const pCfg = PRIORITY_CFG[e.priority] || PRIORITY_CFG.media;
          return (
            <div key={e.name} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-bold text-neutral-900">{e.name}</code>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${pCfg}`}>{pCfg.label}</span>
                    {e.has_notification && <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">notifica</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">{e.description}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-neutral-400">{e.event_type}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">{e.module}</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">fila: {e.queue}</span>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Subscribers</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {e.subscribers.map(s => (
                    <span key={s} className="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-600">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}