import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Factory, ArrowUpCircle, ArrowDownCircle, FileText, ClipboardCheck } from "lucide-react";

const ACTIONS = [
  { label: "Criar Compra", icon: ShoppingCart, path: "/compras", color: "text-indigo-600 bg-indigo-50" },
  { label: "Criar Produção", icon: Factory, path: "/producao", color: "text-cyan-600 bg-cyan-50" },
  { label: "Registrar Pagamento", icon: ArrowUpCircle, path: "/financeiro", color: "text-rose-600 bg-rose-50" },
  { label: "Registrar Recebimento", icon: ArrowDownCircle, path: "/financeiro", color: "text-emerald-600 bg-emerald-50" },
  { label: "Cadastrar Documento", icon: FileText, path: "/documentos", color: "text-amber-600 bg-amber-50" },
  { label: "Inventário", icon: ClipboardCheck, path: "/estoque", color: "text-blue-600 bg-blue-50" },
];

export default function CommandQuickActions() {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {ACTIONS.map(a => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            to={a.path}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:scale-105 ${a.color}`}
          >
            <Icon className="h-4 w-4" />
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}