import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, MessageCircle, Bell, CheckSquare } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

export default function WhatsAppOverview() {
  const [configs, setConfigs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.WhatsAppConfig.list().catch(() => []),
      base44.entities.Notification.filter({ module: "whatsapp" }, "-created_date", 10).catch(() => []),
    ]).then(([c, n]) => {
      setConfigs(c || []);
      setNotifications(n || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-10 text-center text-sm text-neutral-500">Carregando...</div>;

  const linked = configs.filter(c => c.linked);
  const today = new Date().toDateString();
  const activeToday = configs.filter(c => c.last_activity_at && new Date(c.last_activity_at).toDateString() === today);
  const pendingApprovals = configs.reduce((s, c) => s + (c.approvals_pending || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Usuários Vinculados" value={linked.length} hint={`${configs.length} total`} icon={Users} tone="positive" />
        <StatCard label="Ativos Hoje" value={activeToday.length} hint="conversas hoje" icon={MessageCircle} tone="neutral" />
        <StatCard label="Alertas Enviados" value={notifications.length} hint="últimos registrados" icon={Bell} tone="warning" />
        <StatCard label="Aprovações Pendentes" value={pendingApprovals} hint="aguardando" icon={CheckSquare} tone="negative" />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">Notificações Recentes do WhatsApp</h3>
        {notifications.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma notificação enviada ainda. Execute a verificação de alertas proativos para gerar notificações.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 rounded-lg border border-neutral-100 p-3">
                <span className={`mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${n.category === 'urgent' ? 'bg-red-100 text-red-700' : n.category === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {n.category === 'urgent' ? 'CRÍTICO' : n.category === 'warning' ? 'ALERTA' : 'INFO'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-800">{n.title}</p>
                  <p className="text-xs text-neutral-500">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}