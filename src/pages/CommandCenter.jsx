import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { getGreeting } from "@/lib/baronPersonality";
import BaronChat from "@/components/command/BaronChat";
import WhileAwaySummary from "@/components/command/WhileAwaySummary";
import MorningMissions from "@/components/command/MorningMissions";

export default function CommandCenter() {
  const { user } = useAuth();
  const g = getGreeting(user);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        {/* Greeting */}
        <div className="mb-8 text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {g.emoji && <span className="mr-1">👑</span>}{g.title}
          </h2>
          <p className="mt-2 text-base text-primary">{g.subtitle}</p>
        </div>

        {/* Enquanto você estava fora */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enquanto você estava fora</h3>
          <WhileAwaySummary />
        </div>

        {/* Missões do dia */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hoje existem</h3>
          <MorningMissions />
        </div>

        {/* Divisor */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">O que vamos fazer agora?</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* BARON */}
        <BaronChat />
      </div>
    </div>
  );
}