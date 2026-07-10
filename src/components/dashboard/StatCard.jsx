import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "text-neutral-900",
  positive: "text-emerald-600",
  negative: "text-rose-600",
  warning: "text-amber-600",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "neutral", accent }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition-all duration-300 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-neutral-500">{label}</p>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100", accent)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight", TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}