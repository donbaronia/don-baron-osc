import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-secondary/50">
          <Icon className="h-6 w-6 text-small-info" />
        </div>
      )}
      <h3 className="text-base font-semibold text-primary-info">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-secondary-info">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}