import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Bike } from "lucide-react";
import { BaronSelect } from "@/design-system";

export default function Motoboys() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", vehicle: "moto", plate: "", commission_pct: 10, status: "ativo" });

  const load = () => {
    base44.entities.Courier.list("-created_date", 50)
      .then(setCouriers)
      .catch(() => setCouriers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.Courier.create(form);
    setOpen(false);
    setForm({ name: "", phone: "", whatsapp: "", vehicle: "moto", plate: "", commission_pct: 10, status: "ativo" });
    load();
  };

  const columns = [
    { key: "name", header: "Nome", render: (v) => <span className="font-medium text-foreground">{v || "—"}</span> },
    { key: "phone", header: "Telefone" },
    { key: "vehicle", header: "Veículo", render: (v) => v === "moto" ? "Moto" : v === "carro" ? "Carro" : v === "bike" ? "Bicicleta" : v },
    { key: "plate", header: "Placa" },
    { key: "commission_pct", header: "Comissão", render: (v) => `${v || 0}%` },
    { key: "status", header: "Status", render: (v) => <span className={v === "ativo" ? "text-baron-success" : "text-muted-foreground"}>{v || "ativo"}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Motoboys"
        subtitle="Gerencie entregadores, comissões e status de entrega."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Entregador
          </Button>
        }
      />
      <div className="mt-6">
        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-card" />
        ) : couriers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Bike className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum entregador cadastrado.</p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Cadastrar Entregador
            </Button>
          </div>
        ) : (
          <DataTable rows={couriers} columns={columns} />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Entregador</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do entregador" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle">Veículo</Label>
                <BaronSelect value={form.vehicle} onChange={(v) => setForm({ ...form, vehicle: v })} options={[{ value: "moto", label: "Moto" }, { value: "carro", label: "Carro" }, { value: "bike", label: "Bicicleta" }]} />
              </div>
              <div>
                <Label htmlFor="plate">Placa</Label>
                <Input id="plate" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="ABC-1234" />
              </div>
            </div>
            <div>
              <Label htmlFor="commission">Comissão (%)</Label>
              <Input id="commission" type="number" min="0" max="100" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}