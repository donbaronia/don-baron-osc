import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { searchSuppliers } from "@/lib/masterData";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import SupplierForm from "./SupplierForm";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  const load = async () => {
    const s = await base44.entities.Supplier.list("-created_date", 300);
    setSuppliers(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (supplier) => {
    if (!confirm(`Excluir fornecedor "${supplier.name}"?`)) return;
    await base44.entities.Supplier.delete(supplier.id);
    load();
  };

  const filtered = searchSuppliers(suppliers, search);

  const columns = [
    { key: "name", label: "Razão Social", render: (r) => <div><p className="font-medium text-neutral-900">{r.name}</p><p className="text-xs text-neutral-500">{r.trade_name || ""}</p></div> },
    { key: "document_number", label: "CNPJ", render: (r) => r.document_number || "—" },
    { key: "primary_contact", label: "Contato", render: (r) => r.primary_contact || "—" },
    { key: "city", label: "Cidade/UF", render: (r) => r.city ? `${r.city}/${r.state || ""}` : "—" },
    { key: "average_delivery_days", label: "Prazo Entrega", render: (r) => r.average_delivery_days ? `${r.average_delivery_days} dias` : "—" },
    { key: "payment_terms", label: "Pagamento", render: (r) => r.payment_terms || "—" },
    {
      key: "active", label: "Status",
      render: (r) => r.active
        ? <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Ativo</span>
        : <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">Inativo</span>,
    },
    {
      key: "actions", label: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditSupplier(r); setFormOpen(true); }} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => handleDelete(r)} className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} placeholder="Pesquisar fornecedor...">
        <Button onClick={() => { setEditSupplier(null); setFormOpen(true); }} className="gap-2 bg-neutral-900 hover:bg-neutral-800"><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum fornecedor cadastrado" emptyDescription="Cadastre fornecedores para vincular aos produtos e compras." />
      <SupplierForm open={formOpen} onClose={() => setFormOpen(false)} supplier={editSupplier} onSaved={load} />
    </div>
  );
}