import React from "react";

export default function PageHeader({ emoji, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          {emoji && <span className="text-2xl">{emoji}</span>}
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        </div>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}