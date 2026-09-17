import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Consistent empty-state treatment for admin list pages (no data yet / no results for filters). */
export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 px-4 py-12 text-center ${className}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage/40 text-primary">{icon}</div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-base font-semibold text-dark-brown">{title}</p>
        {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
