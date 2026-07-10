import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel, MODULE_STATUS_CONFIG } from "@/lib/kernelEngine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Cpu, Power, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ModuleRegistry({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isolateReason, setIsolateReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.listModules();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleRestart = async (id) => {
    try {
      const res = await BaronKernel.restartModule(id);
      toast({ title: "Módulo reiniciado", description: `${res.restart_time_ms}ms` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleIsolate = async () => {
    if (!selected) return;
    try {
      await BaronKernel.isolateModule(selected.id, isolateReason);
      toast({ title: "Módulo isolado", description: selected.name });
      setSelected(null);
      setIsolateReason("");
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleToggle = async (mod) => {
    try {
      await BaronKernel.updateModule(mod.id, { active: !mod.active, status: !mod.active ? 'active' : 'inactive' });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} módulo(s) registrado(s)</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((mod) => {
            const cfg = MODULE_STATUS_CONFIG[mod.status] || MODULE_STATUS_CONFIG.inactive;
            return (
              <div key={mod.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-neutral-800">{mod.name}</h4>
                      <span className="text-xs text-neutral-400">v{mod.version}</span>
                      {mod.is_core && <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold text-white">CORE</span>}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{mod.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mod.services?.slice(0, 4).map((s) => (
                        <span key={s} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{s}</span>
                      ))}
                      {mod.services?.length > 4 && <span className="text-[10px] text-neutral-400">+{mod.services.length - 4}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleRestart(mod.id)} title="Reiniciar">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(mod)} title={mod.active ? "Desativar" : "Ativar"}>
                      <Power className={`h-3.5 w-3.5 ${mod.active ? "text-emerald-600" : "text-neutral-400"}`} />
                    </Button>
                    {!mod.is_core && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setSelected(mod)} title="Isolar">
                        <ShieldOff className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {mod.last_error && (
                  <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">⚠ {mod.last_error}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Isolar Módulo: {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">O módulo será isolado da plataforma. Usuários não poderão acessá-lo até ser reativado.</p>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              rows={3}
              placeholder="Motivo do isolamento..."
              value={isolateReason}
              onChange={(e) => setIsolateReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleIsolate}>Isolar Módulo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}