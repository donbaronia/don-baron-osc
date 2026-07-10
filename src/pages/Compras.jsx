import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { exportToCsv } from "@/lib/exportCsv";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Compras() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.Purchase.list("-order_date", 300).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => !search || (r.supplier || "").toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "supplier", label: "Fornecedor", render: (r) => <span className="font-medium text-neutral-900">{r.supplier}</span> },
    { key: "description", label: "Descrição", render: (r) => r.description || "—" },
    { key: "total_amount", label: "Valor", render: (r) => brl(r.total_amount) },
    { key: "order_date", label: "Data", render: (r) => (r.order_date ? new Date(r.order_date).toLocaleDateString("pt-BR") : "—") },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="🛒" title="Centro de Compras" subtitle="Pedidos, aprovações e recebimento de mercadorias." />
      <div className="mt-6 space-y-4">
        <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("compras.csv", filtered)} placeholder="Pesquisar compra..." />
        <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma compra registrada" emptyDescription="Os pedidos de compra aparecerão aqui." />
      </div>
    </div>
  );
}