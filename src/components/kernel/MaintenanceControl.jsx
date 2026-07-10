import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel } from "@/lib/kernelEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Power, PowerOff, Wrench } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function MaintenanceControl({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.getMaintenance();
      setItems(res.items || []);
      setActive(res.active || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleToggle = async () => {
    try {
      const res = await BaronKernel.toggleMaintenance(reason, message);
      toast({ title: res.action === 'started' ? "Manutenção iniciada" : "Manutenção encerrada" });
      setReason("");
      setMessage("");
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${active ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-amber-100' : 'bg-neutral-100'}`}>
            <Wrench className={`h-5 w-5 ${active ? 'text-amber-600' : 'text-neutral-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-800">
              {active ? "Modo Manutenção Ativo" : "Sistema Operacional"}
            </h3>
            <p className="text-xs text-neutral-500">
              {active ? `Iniciado por ${active.started_by} em ${active.started_at ? new Date(active.started_at).toLocaleString('pt-BR') : '—'}` : "Nenhuma manutenção ativa"}
            </p>
          </div>
        </div>

        {active && (
          <div className="mt-4 rounded-lg bg-amber-100/50 p-3 text-sm text-amber-800">
            <strong>{active.reason}</strong>
            <p className="mt-1">{active.message}</p>
          </div>
        )}

        {!active && (
          <div className="mt-4 space-y-3">
            <div>
              <Label>Motivo</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Atualização do banco de dados" />
            </div>
            <div>
              <Label>Mensagem aos Usuários</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sistema em manutenção. Voltamos em breve." rows={2} />
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button
            onClick={handleToggle}
            variant={active ? "default" : "destructive"}
            disabled={!active && !reason}
          >
            {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {active ? "Encerrar Manutenção" : "Iniciar Manutenção"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-800">Histórico de Manutenções</h3>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-200/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">Nenhuma manutenção registrada</p>
        ) : (
          <div className="space-y-2">
            {items.map((mw) => (
              <div key={mw.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3">
                <div className={`h-2 w-2 rounded-full ${mw.status === 'active' ? 'bg-amber-500' : mw.status === 'ended' ? 'bg-neutral-400' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-800">{mw.reason}</div>
                  <div className="text-xs text-neutral-500">
                    {mw.started_at ? new Date(mw.started_at).toLocaleString('pt-BR') : '—'}
                    {mw.ended_at && ` → ${new Date(mw.ended_at).toLocaleString('pt-BR')}`}
                    {mw.duration_min > 0 && ` · ${mw.duration_min}min`}
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-400">{mw.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}