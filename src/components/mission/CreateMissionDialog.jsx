import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { MissionControl, MISSION_TYPE_CONFIG, PRIORITY_CONFIG, DEPARTMENT_CONFIG } from "@/lib/missionEngine";
import { toast } from "@/components/ui/use-toast";

export default function CreateMissionDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', objective: '',
    type: 'diaria', priority: 'media', department: 'estrategia',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    expected_result: '', responsible_name: ''
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await MissionControl.createMission(form);
      toast({ title: "Missão criada" });
      setOpen(false);
      setForm({ name: '', description: '', objective: '', type: 'diaria', priority: 'media', department: 'estrategia', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], expected_result: '', responsible_name: '' });
      onCreated?.(res.item);
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />Nova Missão</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Missão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Preparar Sexta-feira" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descrição da missão" />
          </div>
          <div>
            <Label className="text-xs">Objetivo</Label>
            <Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Ex: Garantir operação pronta para pico" />
          </div>
          <div>
            <Label className="text-xs">Resultado Esperado</Label>
            <Input value={form.expected_result} onChange={(e) => setForm({ ...form, expected_result: e.target.value })} placeholder="Ex: Operação 100% pronta" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(MISSION_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <select className={selectClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Departamento</Label>
              <select className={selectClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {Object.entries(DEPARTMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Prazo Final</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Responsável</Label>
            <Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} placeholder="Nome do responsável" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar Missão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}