import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-ivory shadow-subtle hover:bg-primary-light hover:shadow-card",
  secondary: "bg-accent text-dark-brown shadow-subtle hover:bg-accent-dark hover:shadow-card",
  danger: "bg-[#C0392B] text-white shadow-subtle hover:bg-[#A93226] hover:shadow-card",
  ghost: "bg-transparent text-primary hover:bg-[rgba(0,79,46,0.08)]",
};

export function Button({ variant = "primary", isLoading, className = "", disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 active:shadow-subtle disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
