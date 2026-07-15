import React, { useMemo, useState } from "react";
import { ScanSearch, FileWarning, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Auditoria de Design — percorre o código-fonte das páginas/componentes e detecta
 * componentes fora do Design System: botões/inputs/tabelas/selects manuais (HTML cru),
 * cores inline (hex, bg-white, text-black, text-gray-*), etc.
 */
const PAGES = import.meta.glob("/src/pages/**/*.jsx", { query: "?raw", eager: true });
const COMPONENTS = import.meta.glob("/src/components/**/*.jsx", { query: "?raw", eager: true });

const PATTERNS = [
  { id: "rawButton", label: "Botão HTML cru (<button>)", regex: /<button[\s>]/g, severity: "high" },
  { id: "rawInput", label: "Input HTML cru (<input>)", regex: /<input[\s/]/g, severity: "high" },
  { id: "rawTable", label: "Tabela HTML cru (<table>)", regex: /<table[\s>]/g, severity: "high" },
  { id: "rawSelect", label: "Select HTML cru (<select>)", regex: /<select[\s>]/g, severity: "high" },
  { id: "inlineHex", label: "Cor inline (hex)", regex: /\b(bg|text|border|ring|from|to|via)-\[#[0-9a-fA-F]+\]/g, severity: "high" },
  { id: "bgWhite", label: "bg-white / text-black", regex: /\b(bg-white|text-black|bg-black)\b/g, severity: "high" },
  { id: "tailwindGray", label: "Cinza Tailwind (text-gray-*)", regex: /\b(text|bg|border)-gray-\d+\b/g, severity: "medium" },
  { id: "inlineStyle", label: "style={{ color/... }}", regex: /style=\{\{[^}]*color[^}]*\}\}/g, severity: "medium" },
];

const DS_OK = [
  { id: "datagrid", label: "Usa <DataGrid>", regex: /from ["']@\/components\/ds["']|from ["']@\/components\/ds\/DataGrid["']/g },
  { id: "dsBarrel", label: "Importa do Design System", regex: /from ["']@\/components\/ds["']/g },
];

function scan(source) {
  const issues = [];
  let total = 0;
  for (const p of PATTERNS) {
    const matches = source.match(p.regex) || [];
    if (matches.length) { issues.push({ ...p, count: matches.length }); total += matches.length; }
  }
  return { issues, total };
}

export default function DesignAudit() {
  const [filter, setFilter] = useState("all");

  const results = useMemo(() => {
    const all = [];
    for (const [path, src] of Object.entries({ ...PAGES, ...COMPONENTS })) {
      const text = typeof src === "string" ? src : src.default || "";
      const { issues, total } = scan(text);
      const compliant = total === 0;
      const usesDS = DS_OK.some((d) => (text.match(d.regex) || []).length > 0);
      all.push({ path, total, issues, compliant, usesDS });
    }
    return all.sort((a, b) => b.total - a.total);
  }, []);

  const offenders = results.filter((r) => !r.compliant);
  const compliantCount = results.filter((r) => r.compliant).length;
  const dsAdopters = results.filter((r) => r.usesDS).length;

  const shown = filter === "offenders" ? offenders : filter === "ds" ? results.filter((r) => r.usesDS) : results;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ScanSearch className="h-5 w-5 text-baron-orange" /> Auditoria de Design
          </h1>
          <p className="mt-1 text-sm text-secondary-info">
            Varredura estática do código-fonte — detecta componentes manuais e cores fora do Design System Don Baron 2.0.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={FileWarning} label="Arquivos analisados" value={results.length} tone="text-baron-blue" />
        <Metric icon={AlertTriangle} label="Fora do padrão" value={offenders.length} tone={offenders.length ? "text-baron-red" : "text-baron-green"} />
        <Metric icon={CheckCircle2} label="Em conformidade" value={compliantCount} tone="text-baron-green" />
        <Metric icon={CheckCircle2} label="Adotaram DS" value={dsAdopters} tone="text-baron-orange" />
      </div>

      <div className="flex gap-2">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>Todos</FilterBtn>
        <FilterBtn active={filter === "offenders"} onClick={() => setFilter("offenders")}>Não conformes</FilterBtn>
        <FilterBtn active={filter === "ds"} onClick={() => setFilter("ds")}>Usam DS</FilterBtn>
      </div>

      <div className="space-y-2">
        {shown.length === 0 && <p className="text-sm text-secondary-info">Nenhum arquivo neste filtro.</p>}
        {shown.slice(0, 80).map((r) => (
          <div key={r.path} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-foreground">{r.path}</span>
              <div className="flex items-center gap-2">
                {r.compliant ? (
                  <span className="flex items-center gap-1 rounded-md bg-baron-green/15 px-2 py-0.5 text-[10px] font-semibold text-baron-green"><CheckCircle2 className="h-3 w-3" /> OK</span>
                ) : (
                  <span className="flex items-center gap-1 rounded-md bg-baron-red/15 px-2 py-0.5 text-[10px] font-semibold text-baron-red"><AlertTriangle className="h-3 w-3" /> {r.total}</span>
                )}
                {r.usesDS && <span className="rounded-md bg-baron-orange/15 px-2 py-0.5 text-[10px] font-semibold text-baron-orange">DS</span>}
              </div>
            </div>
            {r.issues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.issues.map((it) => (
                  <span key={it.id} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${it.severity === "high" ? "bg-baron-red/10 text-baron-red" : "bg-baron-yellow/10 text-baron-yellow"}`}>
                    {it.label} ×{it.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {shown.length > 80 && <p className="text-center text-xs text-secondary-info">+ {shown.length - 80} arquivos...</p>}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-secondary-info"><Icon className={`h-4 w-4 ${tone}`} /><span className="text-[11px] uppercase tracking-wide">{label}</span></div>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <Button variant={active ? "primary" : "outline"} size="small" onClick={onClick}>{children}</Button>
  );
}