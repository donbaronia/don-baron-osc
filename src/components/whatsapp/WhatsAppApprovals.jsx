import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCw, ShieldAlert } from "lucide-react";

export default function WhatsAppApprovals() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Purchase.filter({ status: "pendente_aprovacao" }, "-created_date", 20)
      .then(setPurchases)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await base44.entities.Purchase.update(id, { status: "aprovada" });
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch {} finally { setProcessing(null); }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      await base44.entities.Purchase.update(id, { status: "cancelada" });
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch {} finally { setProcessing(null); }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-semibold text-neutral-700">Aprovações Pendentes</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {purchases.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">Nenhuma aprovação pendente.</p>
      ) : (
        <div className="space-y-3">
          {purchases.map(p => (
            <div key={p.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-800">{p.supplier}</p>
                  <p className="text-xs text-neutral-500">{p.description || p.purchase_code || "Compra"}</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">
                    R$ {(p.total_amount || 0).toFixed(2)}
                  </p>
                  {(p.total_amount || 0) > 5000 && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      <ShieldAlert className="h-3 w-3" /> Requer PIN
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(p.id)} disabled={processing === p.id} className="bg-emerald-600 hover:bg-emerald-700">
                    <Check className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(p.id)} disabled={processing === p.id}>
                    <X className="h-4 w-4" /> Rejeitar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}