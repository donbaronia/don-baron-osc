import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import { exportToCsv } from "@/lib/exportCsv";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Estoque() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.Product.list("-created_date", 300).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => !search || (r.name || "").toLowerCase().includes(search.toLowerCase()) || (r.sku || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "name", label: "Produto", render: (r) => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "sku", label: "SKU", render: (r) => r.sku || "—" },
    { key: "category", label: "Categoria", render: (r) => r.category || "—" },
    { key: "stock_quantity", label: "Estoque", render: (r) => `${r.stock_quantity || 0} ${r.unit || "un"}` },
    { key: "min_quantity", label: "Mínimo", render: (r) => `${r.min_quantity || 0} ${r.unit || "un"}` },
    { key: "cost_price", label: "Custo", render: (r) => brl(r.cost_price) },
    {
      key: "alert", label: "Situação",
      render: (r) =>
        (r.stock_quantity || 0) <= (r.min_quantity || 0)
          ? <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">Crítico</span>
          : <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Normal</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="📦" title="Centro de Estoque" subtitle="Controle de produtos, níveis mínimos e itens críticos." />
      <div className="mt-6 space-y-4">
        <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("estoque.csv", filtered)} placeholder="Pesquisar produto..." />
        <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum produto cadastrado" emptyDescription="Cadastre produtos ou importe uma planilha para começar." />
      </div>
    </div>
  );
}