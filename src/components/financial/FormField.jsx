import React from "react";
import { Label } from "@/components/ui/label";

export default function FormField({ label, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-neutral-600">{label}</Label>
      {children}
    </div>
  );
}