import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, headerAction, children, className = "" }: CardProps) {
  return (
    <div className={`overflow-hidden rounded-lg bg-ivory shadow-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-ivory">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
