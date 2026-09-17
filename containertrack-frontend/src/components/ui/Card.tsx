import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Adds a hover elevation/lift — opt in for clickable/interactive cards only. */
  hoverable?: boolean;
}

export function Card({ title, headerAction, children, className = "", hoverable = false }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-sage/30 bg-ivory shadow-card transition-all duration-200 ease-out ${
        hoverable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated" : ""
      } ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between bg-gradient-primary px-4 py-3 text-ivory">
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
