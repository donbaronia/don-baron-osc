import React from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, canAccess, ROLE_LABELS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Sidebar({ role, user, onNavigate, collapsed = false }) {
  const location = useLocation();
  const items = NAV_ITEMS.filter((i) => canAccess(i, role));

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("pt-6 pb-4", collapsed ? "flex justify-center px-2" : "px-5")}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/20">
            DB
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold tracking-wide text-foreground">DON BARON</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80">Operating System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navegação simplificada */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Dica BARON */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl bg-sidebar-accent p-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-primary">BARON</span> é a sua porta de entrada. Diga o que precisa e ele abre a tela certa.
          </p>
        </div>
      )}

      {/* Usuário */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2", collapsed && "justify-center px-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {(user?.full_name || "U").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.full_name || "Usuário"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABELS[role] || "Operador"}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => base44.auth.logout("/login")}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}