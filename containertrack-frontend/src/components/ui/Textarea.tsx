import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = "", ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-dark-brown">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        className={`rounded-md border border-sage bg-white px-3 py-2 text-sm text-dark-brown outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:bg-gray-100 disabled:text-gray-400 ${
          error ? "border-[#C0392B]" : ""
        } ${className}`}
        {...rest}
      />
      {hint && !error && <span className="text-xs text-gray-500">{hint}</span>}
      {error && <span className="text-xs text-[#C0392B]">{error}</span>}
    </div>
  );
});
