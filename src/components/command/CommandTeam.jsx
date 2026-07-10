import React from "react";
import SectionCard from "./SectionCard";
import { Users, Bike, UserCheck, UserX, Clock, Calendar, Coffee, Wallet, AlertTriangle } from "lucide-react";

function MiniStat({ icon: Icon, label, value, tone = "text-neutral-700" }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-neutral-400" />
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
      <p className={`mt-0.5 text-sm font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function CommandTeam({ data }) {
  return (
    <>
      <SectionCard icon={Users} title="Recursos Humanos" accent="text-violet-500">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat icon={UserCheck} label="Presentes" value={data.rh.presentes} tone="text-emerald-600" />
          <MiniStat icon={UserX} label="Faltas" value={data.rh.faltas} tone={data.rh.faltas > 0 ? "text-rose-600" : "text-neutral-700"} />
          <MiniStat icon={Clock} label="Atrasos" value={data.rh.atrasos} tone={data.rh.atrasos > 0 ? "text-amber-600" : "text-neutral-700"} />
          <MiniStat icon={Clock} label="Banco de Horas" value={`${data.rh.banco_horas}h`} />
          <MiniStat icon={Calendar} label="Férias" value={data.rh.ferias} />
          <MiniStat icon={Calendar} label="Folgas" value={data.rh.folgas} />
          <MiniStat icon={Coffee} label="Treinamentos" value={data.rh.treinamentos} />
        </div>
        {(data.rh.presentes === 0 && data.rh.faltas === 0 && data.rh.treinamentos === 0) && (
          <p className="mt-3 text-xs text-neutral-400">Módulo de RH não configurado. Dados aparecerão aqui quando disponíveis.</p>
        )}
      </SectionCard>

      <SectionCard icon={Bike} title="Motoboys" accent="text-orange-500">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat icon={UserCheck} label="Check-ins" value={data.motoboys.checkins} tone="text-emerald-600" />
          <MiniStat icon={Bike} label="Diárias" value={data.motoboys.diarias} />
          <MiniStat icon={Users} label="Entregadores Ativos" value={data.motoboys.ativos} />
          <MiniStat icon={AlertTriangle} label="Pendências" value={data.motoboys.pendencias} tone={data.motoboys.pendencias > 0 ? "text-amber-600" : "text-neutral-700"} />
          <MiniStat icon={Coffee} label="Lanches Consumidos" value={data.motoboys.lanches} />
          <MiniStat icon={Wallet} label="Pagamentos Pendentes" value={data.motoboys.pagamentos_pendentes} tone={data.motoboys.pagamentos_pendentes > 0 ? "text-rose-600" : "text-neutral-700"} />
        </div>
        {data.motoboys.checkins === 0 && (
          <p className="mt-3 text-xs text-neutral-400">Módulo de Motoboys não configurado. Dados aparecerão aqui quando disponíveis.</p>
        )}
      </SectionCard>
    </>
  );
}