import * as React from "react";
import { cn } from "@/lib/utils";

// Skeleton loading — nunca deixar tela branca
export function BaronSkeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-card-hover border border-border", className)} />;
}

export function BaronTableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-1.5">
      <BaronSkeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <BaronSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}