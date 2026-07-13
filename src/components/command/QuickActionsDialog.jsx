import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Package, ShoppingCart, UserPlus, Truck, CreditCard,
  ArrowDownCircle, FileText, Zap, Receipt, FilePlus,
} from "lucide-react";

const ACTIONS = [
  { label: "Cadastrar Produto", icon: Package, path: "/cadastro", color: "text-blue-400 bg-blue-500/10" },
  { label: "Registrar Compra", icon: ShoppingCart, path: "/compras", color: "text-indigo-400 bg-indigo-500/10" },
  { label: "Cadastrar Funcionário", icon: UserPlus, path: "/rh", color: "text-emerald-400 bg-emerald-500/10" },
  { label: "Cadastrar Fornecedor", icon: Truck, path: "/cadastro", color: "text-cyan-400 bg-cyan-500/10" },
  { label: "Registrar Pagamento", icon: CreditCard, path: "/financeiro", color: "text-rose-400 bg-rose-500/10" },
  { label: "Lançar Despesa", icon: ArrowDownCircle, path: "/financeiro", color: "text-orange-400 bg-orange-500/10" },
  { label: "Nova Nota Fiscal", icon: Receipt, path: "/processamento", color: "text-amber-400 bg-amber-500/10" },
  { label: "Novo Boleto", icon: FileText, path: "/processamento", color: "text-purple-400 bg-purple-500/10" },
  { label: "Novo Documento", icon: FilePlus, path: "/processamento", color: "text-teal-400 bg-teal-500/10" },
];

export default function QuickActionsDialog({ open, onClose }) {
  const navigate = useNavigate();

  const handleAction = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Nova Ação
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => handleAction(a.path)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-secondary"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-foreground text-center">{a.label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}