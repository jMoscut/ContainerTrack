import type { ReactNode } from "react";

export type PillTone = "success" | "danger" | "warning" | "neutral" | "primary" | "accent";

interface StatusPillProps {
  label: string;
  tone: PillTone;
  /** filled = solid background (use for primary status: active/inactive/pending). outline = ghost border (use for secondary/categorical info: role, country flags, etc). */
  variant?: "filled" | "outline";
  icon?: ReactNode;
  className?: string;
}

const FILLED: Record<PillTone, { bg: string; text: string }> = {
  success: { bg: "#D5F5E3", text: "#006850" },
  danger: { bg: "#FADBD8", text: "#C0392B" },
  warning: { bg: "#FEF9E7", text: "#B8981F" },
  neutral: { bg: "#C8D5C0", text: "#2E2417" },
  primary: { bg: "#004F2E", text: "#FDFDD0" },
  accent: { bg: "#D4AF37", text: "#2E2417" },
};

const OUTLINE: Record<PillTone, { border: string; text: string }> = {
  success: { border: "#006850", text: "#006850" },
  danger: { border: "#C0392B", text: "#C0392B" },
  warning: { border: "#B8981F", text: "#B8981F" },
  neutral: { border: "#8FA187", text: "#2E2417" },
  primary: { border: "#004F2E", text: "#004F2E" },
  accent: { border: "#B8961F", text: "#8a6f16" },
};

/** Small pill used for role/status/category indicators across the admin pages (users, shipping companies, ports). */
export function StatusPill({ label, tone, variant = "filled", icon, className = "" }: StatusPillProps) {
  if (variant === "outline") {
    const style = OUTLINE[tone];
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border bg-white/60 px-2.5 py-1 text-xs font-semibold ${className}`}
        style={{ borderColor: style.border, color: style.text }}
      >
        {icon}
        {label}
      </span>
    );
  }
  const style = FILLED[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {icon}
      {label}
    </span>
  );
}
