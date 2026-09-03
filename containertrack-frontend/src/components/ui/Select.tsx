import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className = "", children, ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-dark-brown">
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={`rounded-md border border-sage bg-white px-3 py-2 text-sm text-dark-brown outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:bg-gray-100 disabled:text-gray-400 ${
          error ? "border-[#C0392B]" : ""
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-xs text-[#C0392B]">{error}</span>}
    </div>
  );
});
