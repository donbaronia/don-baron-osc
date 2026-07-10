import React from "react";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Componente de pesquisa + exportação padrão, reutilizado em todos os centros.
export default function Toolbar({ search, onSearch, onExport, children, placeholder = "Pesquisar..." }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9 bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="gap-2 bg-white">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        )}
      </div>
    </div>
  );
}