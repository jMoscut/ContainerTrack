import type { ReactNode } from "react";

interface MobileRowCardRow {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

interface MobileRowCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  rows?: MobileRowCardRow[];
  actions?: ReactNode;
}

/**
 * Card-per-row presentation for admin list pages below the `md:` breakpoint, where a
 * horizontally-cramped table stops being usable. Pair with a `hidden md:block` table and a
 * `md:hidden` list of these cards. Shared across Users, Shipping Companies and Ports.
 */
export function MobileRowCard({ title, subtitle, badges, rows, actions }: MobileRowCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-sage/40 bg-white p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-dark-brown">{title}</p>
          {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-sage/40 pt-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-gray-500">
                {row.icon}
                {row.label}
              </span>
              <span className="text-right font-medium text-dark-brown">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
