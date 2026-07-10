import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel } from "@/lib/kernelEngine";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, Cpu, Database, HeartPulse, Loader2, Power, Shield, Users, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function KernelDashboard({ refreshKey, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.getDashboard();
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleBoot = async () => {
    setBooting(true);
    try {
      const res = await BaronKernel.boot();
      toast({ title: `Kernel inicializado em ${res.total_boot_time_ms}ms`, description: `${res.modules_registered} módulo(s) registrado(s)` });
      load();
      onRefresh?.();
    } catch (e) {
      toast({ title: "Erro no boot", description: e.message, variant: "destructive" });
    } finally {
      setBooting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800">Estado do Kernel</h2>
          <p className="text-sm text-neutral-500">
            {m.maintenance_active ? "🟡 Modo manutenção ativo" : `Último boot: ${m.last_boot ? new Date(m.last_boot).toLocaleString('pt-BR') : '—'}`}
          </p>
        </div>
        <Button onClick={handleBoot} disabled={booting}>
          {booting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          {booting ? "Inicializando..." : "Iniciar Boot"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Saúde do Sistema" value={`${m.health_score}%`} icon={HeartPulse} tone={m.health_score >= 90 ? "positive" : m.health_score >= 75 ? "warning" : "negative"} hint={m.health_status} />
        <StatCard label="Módulos Ativos" value={`${m.active_modules}/${m.total_modules}`} icon={Cpu} tone="positive" hint={m.failed_modules > 0 ? `${m.failed_modules} com falha` : "Todos operacionais"} />
        <StatCard label="Serviços Ativos" value={`${m.active_services}/${m.total_services}`} icon={Database} tone="neutral" />
        <StatCard label="Usuários Online" value={m.online_users} icon={Users} tone="neutral" />
        <StatCard label="Componentes Saudáveis" value={m.healthy_components} icon={Shield} tone="positive" hint={m.unhealthy_components > 0 ? `${m.unhealthy_components} críticos` : "Tudo OK"} />
        <StatCard label="Eventos/min" value={m.events_per_min} icon={Zap} tone="neutral" />
        <StatCard label="Tempo de Boot" value={`${m.boot_time_ms}ms`} icon={Activity} tone="neutral" />
        <StatCard label="Licença" value={m.license_plan} icon={Shield} tone={m.license_status === 'active' ? "positive" : "warning"} hint={m.license_status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Módulos do Núcleo</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.modules.map((mod) => (
              <div key={mod.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-2.5">
                <div className={`h-2 w-2 rounded-full ${mod.status === 'active' ? 'bg-emerald-500' : mod.status === 'failed' ? 'bg-red-500' : mod.status === 'isolated' ? 'bg-purple-500' : 'bg-neutral-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800">{mod.name}</span>
                    {mod.is_core && <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold text-white">CORE</span>}
                  </div>
                  <p className="text-xs text-neutral-500">v{mod.version} · {mod.services?.length || 0} serviços · {mod.events_published?.length || 0} eventos</p>
                </div>
                <span className={`text-xs font-semibold ${mod.status === 'active' ? 'text-emerald-600' : mod.status === 'failed' ? 'text-red-600' : 'text-neutral-400'}`}>
                  {mod.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Últimos Health Checks</h3>
          {data.health_checks.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-sm text-neutral-400">Nenhum health check executado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.health_checks.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-2.5">
                  <div className={`h-2 w-2 rounded-full ${h.status === 'healthy' ? 'bg-emerald-500' : h.status === 'degraded' ? 'bg-orange-500' : 'bg-red-500'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-800">{h.component}</div>
                    <div className="text-xs text-neutral-500">{h.details || h.component_type}</div>
                  </div>
                  <span className="text-xs text-neutral-400">{h.response_time_ms}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}