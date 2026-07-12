import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "text-foreground",
  positive: "text-baron-success",
  negative: "text-baron-error",
  warning: "text-baron-alert",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "neutral", accent }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:bg-secondary/40">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-secondary", accent)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight", TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}