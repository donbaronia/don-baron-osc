import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BaronSelect } from "@/design-system";
import { Plus, Trash2 } from "lucide-react";

/**
 * Editor de conversões de unidade para o Cadastro Mestre de Produtos.
 * Permite cadastrar: 1 caixa = 12 unidades, 1 peça = 4.200 kg, etc.
 */
export default function UnitConversionEditor({ conversions = [], units = [], onChange }) {
  const addConversion = () => {
    onChange([...conversions, { from_unit: "", to_unit: "", factor: 1, description: "" }]);
  };

  const updateConversion = (idx, field, value) => {
    onChange(conversions.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const removeConversion = (idx) => {
    onChange(conversions.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {conversions.length === 0 && (
        <p className="text-xs text-small-info">Nenhuma conversão cadastrada. Ex: 1 Caixa = 12 Unidades.</p>
      )}
      {conversions.map((conv, idx) => (
        <div key={idx} className="flex items-center gap-2 rounded-lg border border-border p-2">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground">1</span>
          </div>
          <div className="w-28"><BaronSelect size="sm" value={conv.from_unit} onChange={(v) => updateConversion(idx, "from_unit", v)} options={units.map((u) => ({ value: u.abbreviation, label: u.abbreviation }))} placeholder="De" /></div>
          <span className="text-sm font-medium text-primary-info">=</span>
          <Input
            type="number"
            step="0.001"
            value={conv.factor}
            onChange={(e) => updateConversion(idx, "factor", parseFloat(e.target.value) || 0)}
            className="w-20"
          />
          <div className="w-28"><BaronSelect size="sm" value={conv.to_unit} onChange={(v) => updateConversion(idx, "to_unit", v)} options={units.map((u) => ({ value: u.abbreviation, label: u.abbreviation }))} placeholder="Para" /></div>
          <Input
            value={conv.description || ""}
            onChange={(e) => updateConversion(idx, "description", e.target.value)}
            placeholder="Descrição (opcional)"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => removeConversion(idx)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-baron-red/10 hover:text-baron-red"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addConversion} className="gap-1">
        <Plus className="h-4 w-4" /> Adicionar conversão
      </Button>
    </div>
  );
}