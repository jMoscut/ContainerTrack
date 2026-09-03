import type { ContainerStatus } from "../../types/container";
import { DELAY_FLAG_STATUS } from "../../types/container";

type BadgeStatus = ContainerStatus | typeof DELAY_FLAG_STATUS;

const STATUS_STYLES: Record<BadgeStatus, { bg: string; text: string; label: string }> = {
  REGISTERED: { bg: "#C8D5C0", text: "#2E2417", label: "Registrado" },
  DEPARTED_ORIGIN: { bg: "#D4AF37", text: "#2E2417", label: "Salió de origen" },
  ARRIVED_PORT: { bg: "#006850", text: "#FDFDD0", label: "Llegó a puerto" },
  DEPARTED_PORT: { bg: "#004F2E", text: "#FDFDD0", label: "Salió de puerto" },
  ARRIVED_WAREHOUSE: { bg: "#006850", text: "#FDFDD0", label: "Llegó a bodega" },
  DISCHARGED: { bg: "#004F2E", text: "#D4AF37", label: "Descargado" },
  DELAY_FLAG: { bg: "#C0392B", text: "#FFFFFF", label: "Retraso" },
};

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function Badge({ status, className = "" }: BadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export function statusLabel(status: BadgeStatus): string {
  return STATUS_STYLES[status].label;
}
