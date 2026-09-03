import { CheckCircle2, AlertTriangle, PackageCheck, Ship, Warehouse, Anchor, MapPin } from "lucide-react";
import type { ContainerStatus } from "../../types/container";
import { CONTAINER_STATUS_ORDER } from "../../types/container";
import { statusLabel } from "../../components/ui/Badge";

const STAGE_ICONS: Record<ContainerStatus, typeof Ship> = {
  REGISTERED: PackageCheck,
  DEPARTED_ORIGIN: Ship,
  ARRIVED_PORT: Anchor,
  DEPARTED_PORT: MapPin,
  ARRIVED_WAREHOUSE: Warehouse,
  DISCHARGED: CheckCircle2,
};

interface ContainerTimelineProps {
  status: ContainerStatus;
  delayFlag: boolean;
}

export function ContainerTimeline({ status, delayFlag }: ContainerTimelineProps) {
  const currentIndex = CONTAINER_STATUS_ORDER.indexOf(status);

  return (
    <div className="flex flex-col gap-3">
      {delayFlag && (
        <div className="flex items-center gap-2 rounded-md bg-[#FADBD8] px-3 py-2 text-sm font-medium text-[#C0392B]">
          <AlertTriangle size={16} />
          Este contenedor tiene un retraso marcado.
        </div>
      )}
      <div className="flex items-center overflow-x-auto pb-2">
        {CONTAINER_STATUS_ORDER.map((stage, index) => {
          const Icon = STAGE_ICONS[stage];
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const colorClass = isDone
            ? "bg-primary text-ivory border-primary"
            : isCurrent
              ? "bg-accent text-dark-brown border-accent"
              : "bg-white text-gray-400 border-sage";

          return (
            <div key={stage} className="flex flex-1 flex-col items-center gap-1 last:flex-none">
              <div className="flex w-full items-center">
                {index !== 0 && (
                  <div className={`h-0.5 flex-1 ${index <= currentIndex ? "bg-primary" : "bg-sage"}`} />
                )}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${colorClass}`}
                >
                  {isDone ? <CheckCircle2 size={20} /> : <Icon size={18} />}
                </div>
                {index !== CONTAINER_STATUS_ORDER.length - 1 && (
                  <div className={`h-0.5 flex-1 ${index < currentIndex ? "bg-primary" : "bg-sage"}`} />
                )}
              </div>
              <span
                className={`w-20 text-center text-xs font-medium ${
                  isCurrent ? "text-dark-brown" : "text-gray-500"
                }`}
              >
                {statusLabel(stage)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
