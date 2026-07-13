import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, FileText, Wallet, Package, Factory, ShoppingCart,
  Users, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  { icon: Home, label: "Home", path: "/" },
  { icon: FileText, label: "Documentos", path: "/processamento" },
  { icon: Wallet, label: "Financeiro", path: "/financeiro" },
  { icon: Package, label: "Estoque", path: "/estoque" },
  { icon: Factory, label: "Produção", path: "/producao" },
  { icon: ShoppingCart, label: "Compras", path: "/compras" },
  { icon: Users, label: "RH", path: "/rh" },
  { icon: BarChart3, label: "Intelligence", path: "/inteligencia" },
  { icon: Settings, label: "Config", path: "/administracao" },
];

export default function ModuleBar() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MODULES.map((m) => {
        const Icon = m.icon;
        return (
          <button
            key={m.path}
            onClick={() => navigate(m.path)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            )}
            title={m.label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}