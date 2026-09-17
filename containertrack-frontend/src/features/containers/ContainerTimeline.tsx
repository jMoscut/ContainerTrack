import { CheckCircle2, AlertTriangle, PackageCheck, Ship, Warehouse, Anchor, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const currentIndex = CONTAINER_STATUS_ORDER.indexOf(status);

  return (
    <div className="flex flex-col gap-4">
      {delayFlag && (
        <div className="flex items-center gap-2 rounded-md bg-[#FADBD8] px-3 py-2 text-sm font-medium text-[#C0392B]">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {t("containers.delayWarning")}
        </div>
      )}

      {/* Desktop / tablet: horizontal stepper */}
      <div className="hidden items-start sm:flex">
        {CONTAINER_STATUS_ORDER.map((stage, index) => {
          const Icon = STAGE_ICONS[stage];
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const colorClass = isDone
            ? "bg-primary text-ivory border-primary"
            : isCurrent
              ? "bg-accent text-dark-brown border-accent shadow-[0_0_0_4px_rgba(212,175,55,0.25)]"
              : "bg-white text-gray-400 border-sage";

          return (
            <div key={stage} className="flex flex-1 flex-col items-center gap-2 last:flex-none">
              <div className="flex w-full items-center">
                {index !== 0 && (
                  <div className={`h-0.5 flex-1 ${index <= currentIndex ? "bg-primary" : "bg-sage"}`} />
                )}
                <div className="relative flex-shrink-0">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${colorClass}`}
                  >
                    {isDone ? <CheckCircle2 size={20} /> : <Icon size={19} />}
                  </div>
                  {isCurrent && delayFlag && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#C0392B] text-white ring-2 ring-white">
                      <AlertTriangle size={11} />
                    </span>
                  )}
                </div>
                {index !== CONTAINER_STATUS_ORDER.length - 1 && (
                  <div className={`h-0.5 flex-1 ${index < currentIndex ? "bg-primary" : "bg-sage"}`} />
                )}
              </div>
              <span
                className={`w-24 text-center text-xs font-medium ${
                  isCurrent ? "font-semibold text-dark-brown" : isDone ? "text-dark-brown/80" : "text-gray-400"
                }`}
              >
                {statusLabel(stage)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="flex flex-col sm:hidden">
        {CONTAINER_STATUS_ORDER.map((stage, index) => {
          const Icon = STAGE_ICONS[stage];
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === CONTAINER_STATUS_ORDER.length - 1;
          const colorClass = isDone
            ? "bg-primary text-ivory border-primary"
            : isCurrent
              ? "bg-accent text-dark-brown border-accent shadow-[0_0_0_4px_rgba(212,175,55,0.25)]"
              : "bg-white text-gray-400 border-sage";

          return (
            <div key={stage} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="relative flex-shrink-0">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${colorClass}`}
                  >
                    {isDone ? <CheckCircle2 size={18} /> : <Icon size={17} />}
                  </div>
                  {isCurrent && delayFlag && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C0392B] text-white ring-2 ring-white">
                      <AlertTriangle size={9} />
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 ${index < currentIndex ? "bg-primary" : "bg-sage"}`} style={{ minHeight: 24 }} />
                )}
              </div>
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={`pt-2 text-sm font-medium leading-none ${
                    isCurrent ? "font-semibold text-dark-brown" : isDone ? "text-dark-brown/80" : "text-gray-400"
                  }`}
                >
                  {statusLabel(stage)}
                </p>
                {isCurrent && <p className="mt-1 text-xs text-primary">{t("containers.currentStage")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
