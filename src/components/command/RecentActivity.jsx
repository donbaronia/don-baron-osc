import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Activity } from "lucide-react";

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SystemEvent.list("-created_date", 8)
      .then(events => {
        setActivities(events || []);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-card" />;
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma atividade recente.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <div className="space-y-1">
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{a.event_name || a.event_type || "Evento"}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {a.module || "sistema"} · {a.user_name || "sistema"} · {new Date(a.created_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}