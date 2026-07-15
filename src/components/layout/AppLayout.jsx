import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { recoverProcesses } from "@/lib/documentWorkflow";
import { recoverAll } from "@/lib/enterpriseCore";
import { RecoveryEngine } from "@/lib/recoveryEngine";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/bds/GlobalSearch";
import BDSHelp from "@/components/bds/BDSHelp";
import { useAuth } from "@/lib/AuthContext";
import { getUserRole, ROLE_LABELS } from "@/lib/navigation";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/donBaronCore";
import BaronPanel from "@/components/command/BaronPanel";
import QuickActionsDialog from "@/components/command/QuickActionsDialog";
import ModuleBar from "@/components/layout/ModuleBar";
import { Menu, X, PanelLeftClose, PanelLeftOpen, Bell, LogOut, Home, Brain, Target, Zap } from "lucide-react";

export default function AppLayout() {
  const { user } = useAuth();
  Core.setCurrentUser(user);
  const role = getUserRole(user);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showBaron, setShowBaron] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // RECUPERAÇÃO AUTOMÁTICA: ao iniciar o sistema, retoma TODOS os processos não concluídos
  // do último estado válido. Proibido reiniciar do início. Documentos + comandos do Baron.
  useEffect(() => {
    let mounted = true;
    Promise.all([recoverAll(user), recoverProcesses(user), RecoveryEngine.recoverPending()])
      .then(([coreRes, docRes, recRes]) => {
        if (mounted) {
          const coreN = coreRes.resumed?.length || 0;
          const docN = docRes.resumed?.length || 0;
          const recN = recRes?.resumed || 0;
          if (coreN + docN + recN > 0) {
            console.log(`[DON BARON ENTERPRISE CORE] ${coreRes.scanned} processo(s) de comando + ${docRes.scanned} de documento verificados. ${coreN + docN} retomado(s) do último estado válido.`);
            console.log(`[RECOVERY ENGINE] ${recRes?.scanned || 0} operação(ões) de gravação interrompida(s). ${recN} retomada(s) do pipeline.`);
          }
        }
      })
      .catch((e) => console.warn("[DON BARON ENTERPRISE CORE] Recuperação automática falhou:", e.message));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts([
    { combo: "ctrl+k", action: () => document.querySelector?.("[data-bds-search]")?.focus() },
    { combo: "ctrl+b", action: () => setShowBaron(true) },
    { combo: "escape", action: () => { setShowProfile(false); setShowBaron(false); } },
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <Sidebar role={role} user={user} collapsed={collapsed} />
      </div>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar role={role} user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior */}
        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
          {/* Toggle mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Toggle recolher sidebar desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary lg:block"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          {/* Home */}
          <button
            onClick={() => navigate("/")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Central de Comando"
          >
            <Home className="h-4 w-4" />
          </button>

          {/* Pesquisa global */}
          <GlobalSearch />

          {/* Ações da barra superior */}
          <div className="flex items-center gap-0.5">
            {/* BARON */}
            <button
              onClick={() => setShowBaron(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-2 text-primary transition-all hover:bg-primary/20"
              title="Conversar com BARON (Ctrl+B)"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden text-xs font-semibold sm:inline">BARON</span>
            </button>

            {/* Missões */}
            <button
              onClick={() => navigate("/missions")}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Missões"
            >
              <Target className="h-4 w-4" />
            </button>

            {/* Ações Rápidas */}
            <button
              onClick={() => setShowQuickActions(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Nova Ação"
            >
              <Zap className="h-4 w-4" />
            </button>

            {/* Ajuda contextual */}
            <BDSHelp />

            {/* Notificações */}
            <button
              onClick={() => navigate("/")}
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Notificações"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>

            {/* Perfil */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-secondary"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {(user?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-[120px] truncate text-xs font-medium text-foreground">{user?.full_name || "Usuário"}</p>
                  <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[role] || "Operador"}</p>
                </div>
              </button>

              {showProfile && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-medium text-foreground">{user?.full_name || "Usuário"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
                    </div>
                    <button
                      onClick={() => { setShowProfile(false); base44.auth.logout("/login"); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <ModuleBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      <BaronPanel open={showBaron} onClose={() => setShowBaron(false)} />
      <QuickActionsDialog open={showQuickActions} onClose={() => setShowQuickActions(false)} />
      </div>
    </div>
  );
}