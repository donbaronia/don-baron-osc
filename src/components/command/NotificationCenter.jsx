import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Notification.list("-created_date", 8)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-card" />;
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">Sem notificações.</p>
      </div>
    );
  }

  const getIcon = (category) => {
    if (category === "urgent") return <AlertTriangle className="h-4 w-4 text-baron-error" />;
    if (category === "warning") return <AlertTriangle className="h-4 w-4 text-baron-alert" />;
    if (category === "success") return <CheckCircle2 className="h-4 w-4 text-baron-success" />;
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <div className="space-y-1">
        {notifications.map(n => (
          <div key={n.id} className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary">
            <div className="mt-0.5 shrink-0">{getIcon(n.category)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{n.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}