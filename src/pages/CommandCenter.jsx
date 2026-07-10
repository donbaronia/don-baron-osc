import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getUserRole } from "@/lib/navigation";
import { BI } from "@/lib/biEngine";
import CommandGreeting from "@/components/command/CommandGreeting";
import CommandExecutiveAI from "@/components/command/CommandExecutiveAI";
import CommandQuickActions from "@/components/command/CommandQuickActions";
import CommandSummary from "@/components/command/CommandSummary";
import CommandFinancial from "@/components/command/CommandFinancial";
import CommandStock from "@/components/command/CommandStock";
import CommandProduction from "@/components/command/CommandProduction";
import CommandTeam from "@/components/command/CommandTeam";
import CommandClients from "@/components/command/CommandClients";
import CommandAlerts from "@/components/command/CommandAlerts";
import CommandForecasts from "@/components/command/CommandForecasts";

const ROLE_SECTIONS = {
  administrador: ["summary", "financial", "stock", "production", "team", "clients", "forecasts", "alerts"],
  gerencia: ["summary", "financial", "stock", "production", "team", "clients", "forecasts", "alerts"],
  financeiro: ["summary", "financial", "forecasts", "alerts"],
  compras: ["stock", "alerts"],
  producao: ["production", "stock", "alerts"],
  estoque: ["stock", "alerts"],
  operador: ["alerts"],
};

export default function CommandCenter() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    BI.getCommandCenter()
      .then(r => {
        setData(r);
        setLoading(false);
        BI.getExecutiveAISummary(r)
          .then(summary => { setAiSummary(summary); setAiLoading(false); })
          .catch(() => setAiLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  const canSee = (section) => (ROLE_SECTIONS[role] || ["alerts"]).includes(section);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />
        <div className="mt-6 h-32 animate-pulse rounded-2xl bg-neutral-200/60" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-200/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      <CommandGreeting data={data} user={user} />
      <CommandExecutiveAI summary={aiSummary} loading={aiLoading} />
      <CommandQuickActions />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canSee("summary") && <CommandSummary data={data} />}
        {canSee("financial") && <CommandFinancial data={data} />}
        {canSee("stock") && <CommandStock data={data} />}
        {canSee("production") && <CommandProduction data={data} />}
        {canSee("team") && <CommandTeam data={data} />}
        {canSee("clients") && <CommandClients data={data} />}
        {canSee("forecasts") && <CommandForecasts data={data} />}
        {canSee("alerts") && <CommandAlerts alerts={data.alertas} />}
      </div>
    </div>
  );
}