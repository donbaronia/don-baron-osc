import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { getGreeting } from "@/lib/baronPersonality";
import BaronConsole from "@/components/command/BaronConsole";
import MorningMissions from "@/components/command/MorningMissions";

export default function CommandCenter() {
  const { user } = useAuth();
  const g = getGreeting(user);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        {/* Saudação compacta */}
        <div className="mb-6 text-center animate-fade-in">
          <div className="mb-1 text-sm font-semibold uppercase tracking-widest text-primary">👑 BARON</div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{g.title}</h2>
          {g.subtitle && <p className="mt-1 text-sm text-muted-foreground">{g.subtitle}</p>}
        </div>

        {/* Resumo operacional compacto */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <MorningMissions />
        </div>

        {/* Divisor */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">O que vamos fazer agora?</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* BARON */}
        <BaronConsole />
      </div>
    </div>
  );
}