import React from "react";

export default function SectionCard({ icon: Icon, title, children, className = "", accent = "text-neutral-500" }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center gap-2">
          {Icon && <Icon className={`h-5 w-5 ${accent}`} />}
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}