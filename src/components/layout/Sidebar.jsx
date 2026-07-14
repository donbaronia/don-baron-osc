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
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("pt-6 pb-6", collapsed ? "flex justify-center px-2" : "px-5")}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-baron-orange text-base font-black text-white shadow-lg shadow-baron-orange/25">
            DB
          </div>
          {!collapsed && (
            <div>
              <p className="text-title text-sm font-bold tracking-wide">DON BARON</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-baron-orange/80">Operating System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navegação — ícones maiores, espaçamento perfeito */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
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
                "group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200",
                collapsed && "justify-center px-0",
                active
                  ? "bg-baron-orange/10 text-baron-orange font-semibold"
                  : "text-gray-info hover:bg-sidebar-accent hover:text-primary-info"
              )}
            >
              {active && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-baron-orange" />}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  active ? "text-baron-orange" : "text-gray-info group-hover:text-primary-info"
                )}
              />
              {!collapsed && <span className="tracking-tight">{item.label}</span>}
              {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-baron-orange" />}
            </Link>
          );
        })}
      </nav>

      {/* Usuário */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2", collapsed && "justify-center px-0")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-baron-orange/15 text-sm font-semibold text-baron-orange">
            {(user?.full_name || "U").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary-info">{user?.full_name || "Usuário"}</p>
              <p className="truncate text-[11px] text-gray-info">{ROLE_LABELS[role] || "Operador"}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => base44.auth.logout("/login")}
              className="rounded-lg p-2 text-gray-info transition-colors hover:bg-sidebar-accent hover:text-primary-info"
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