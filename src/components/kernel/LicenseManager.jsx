import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel, LICENSE_PLAN_LABELS } from "@/lib/kernelEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCheck, Shield, Users, Building2, HardDrive, Package } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function LicenseManager({ refreshKey }) {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.getLicense();
      setLicense(res.item);
      if (res.item) {
        setForm({
          plan: res.item.plan,
          status: res.item.status,
          max_users: res.item.max_users,
          max_companies: res.item.max_companies,
          storage_limit_mb: res.item.storage_limit_mb,
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleSave = async () => {
    try {
      await BaronKernel.updateLicense(license.id, {
        plan: form.plan,
        status: form.status,
        max_users: Number(form.max_users),
        max_companies: Number(form.max_companies),
        storage_limit_mb: Number(form.storage_limit_mb),
      });
      toast({ title: "Licença atualizada" });
      setEditing(false);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-200/60" />;
  }

  if (!license) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
        <Shield className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-sm text-neutral-400">Nenhuma licença configurada. Execute o boot do Kernel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800">
              <BadgeCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">{LICENSE_PLAN_LABELS[license.plan] || license.plan}</h3>
              <p className="text-xs text-neutral-500">Chave: {license.license_key?.substring(0, 16)}...</p>
            </div>
          </div>
          <span className={`text-xs font-semibold ${license.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {license.status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-500">Usuários</div>
              <div className="text-sm font-semibold text-neutral-800">{editing ? <Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} className="h-7 w-20" /> : license.max_users}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-500">Empresas</div>
              <div className="text-sm font-semibold text-neutral-800">{editing ? <Input type="number" value={form.max_companies} onChange={(e) => setForm({ ...form, max_companies: e.target.value })} className="h-7 w-20" /> : license.max_companies}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-500">Armazenamento</div>
              <div className="text-sm font-semibold text-neutral-800">{editing ? <Input type="number" value={form.storage_limit_mb} onChange={(e) => setForm({ ...form, storage_limit_mb: e.target.value })} className="h-7 w-20" /> : `${(license.storage_limit_mb / 1024).toFixed(0)}GB`}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-500">Módulos</div>
              <div className="text-sm font-semibold text-neutral-800">{license.active_modules?.length || 0}</div>
            </div>
          </div>
        </div>

        {editing && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Plano</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENSE_PLAN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar Licença</Button>
          )}
        </div>
      </div>

      {license.premium_features && license.premium_features.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800">Recursos Premium</h3>
          <div className="flex flex-wrap gap-2">
            {license.premium_features.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                <BadgeCheck className="h-3 w-3" /> {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}