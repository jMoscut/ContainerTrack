import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import type { ContainerStatus } from "../../types/container";
import { DELAY_FLAG_STATUS } from "../../types/container";

type BadgeStatus = ContainerStatus | typeof DELAY_FLAG_STATUS;

const STATUS_STYLES: Record<BadgeStatus, { bg: string; text: string }> = {
  REGISTERED: { bg: "#C8D5C0", text: "#2E2417" },
  DEPARTED_ORIGIN: { bg: "#D4AF37", text: "#2E2417" },
  ARRIVED_PORT: { bg: "#006850", text: "#FDFDD0" },
  DEPARTED_PORT: { bg: "#004F2E", text: "#FDFDD0" },
  ARRIVED_WAREHOUSE: { bg: "#006850", text: "#FDFDD0" },
  DISCHARGED: { bg: "#004F2E", text: "#D4AF37" },
  DELAY_FLAG: { bg: "#C0392B", text: "#FFFFFF" },
};

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function Badge({ status, className = "" }: BadgeProps) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide shadow-subtle ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: style.text, opacity: 0.65 }} />
      {t(`status.${status}`)}
    </span>
  );
}

/**
 * Callable outside component render (table cell mappers, etc). Uses the global
 * i18n instance directly, so the caller's own component must re-render on
 * language change (e.g. via its own `useTranslation()` call) for this to update.
 */
export function statusLabel(status: BadgeStatus): string {
  return i18n.t(`status.${status}`);
}
