import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getGreeting, getLoginMessage } from "@/lib/baronPersonality";
import BaronChat from "@/components/command/BaronChat";
import CommandPriorities from "@/components/command/CommandPriorities";
import DailySummary from "@/components/command/DailySummary";
import RecentActivity from "@/components/command/RecentActivity";
import NotificationCenter from "@/components/command/NotificationCenter";

export default function CommandCenter() {
  const { user } = useAuth();
  const g = getGreeting(user);
  const [loginMsg, setLoginMsg] = useState(null);

  useEffect(() => {
    if (!g.emoji) {
      setLoginMsg(getLoginMessage());
    }
  }, [g.emoji]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <span className="text-lg font-black text-primary-foreground">DB</span>
          </div>
          <h1 className="mt-3 text-sm font-bold uppercase tracking-[0.3em] text-primary">DON BARON</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Operating System</p>
        </div>

        {/* Greeting */}
        <div className="mb-6 text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {g.emoji && <span className="mr-1">👑</span>}{g.title}
          </h2>
          <p className="mt-2 text-base text-muted-foreground">{g.subtitle}</p>
          {loginMsg && (
            <p className="mt-1 text-sm text-primary/80">{loginMsg}</p>
          )}
        </div>

        {/* Prioridades do dia */}
        <div className="mb-8">
          <CommandPriorities />
        </div>

        {/* BARON Chat */}
        <div className="mb-2 text-center">
          <p className="text-sm text-muted-foreground">O que vamos fazer hoje?</p>
        </div>
        <BaronChat />

        {/* Resumo do dia */}
        <div className="mt-10">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo do Dia</h3>
          <DailySummary />
        </div>

        {/* Atividades + Notificações */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atividades Recentes</h3>
            <RecentActivity />
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notificações</h3>
            <NotificationCenter />
          </div>
        </div>
      </div>
    </div>
  );
}