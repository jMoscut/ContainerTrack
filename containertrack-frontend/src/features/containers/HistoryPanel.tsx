import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, ArrowRight, History as HistoryIcon, Pencil } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/shared/Spinner";
import { containersApi } from "../../api/containersApi";
import { formatDateTime } from "../../utils/dateFormat";
import { statusLabel } from "../../components/ui/Badge";
import type { ContainerStatus } from "../../types/container";
import { CONTAINER_STATUS_ORDER } from "../../types/container";

interface HistoryPanelProps {
  containerId: string;
}

function safeStatusLabel(value: string): string {
  return (CONTAINER_STATUS_ORDER as string[]).includes(value)
    ? statusLabel(value as ContainerStatus)
    : value;
}

export function HistoryPanel({ containerId }: HistoryPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["containerHistory", containerId],
    queryFn: () => containersApi.history(containerId),
    enabled: isOpen,
  });

  const statusChanges = data?.filter((h) => h.type === "STATUS_CHANGE") ?? [];
  const fieldChanges = data?.filter((h) => h.type === "FIELD_CHANGE") ?? [];

  return (
    <Card
      title={
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setIsOpen((v) => !v)}
        >
          <span>{t("history.title")}</span>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      }
    >
      {isOpen && (
        <div className="flex flex-col gap-6">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          )}

          {data && (
            <>
              <div>
                <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-dark-brown">
                  <HistoryIcon size={14} className="text-primary" />
                  {t("history.statusChanges")}
                </h4>
                {statusChanges.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("history.noStatusChanges")}</p>
                ) : (
                  <ul className="flex flex-col">
                    {statusChanges.map((change, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-primary bg-ivory" />
                          {i !== statusChanges.length - 1 && (
                            <span className="w-0.5 flex-1 bg-sage" style={{ minHeight: 20 }} />
                          )}
                        </div>
                        <div className="pb-4 text-sm">
                          <p className="flex flex-wrap items-center gap-1.5 font-medium text-dark-brown">
                            {safeStatusLabel(change.oldValue ?? "")}
                            <ArrowRight size={13} className="text-gray-400" />
                            {safeStatusLabel(change.newValue ?? "")}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {change.updatedByName ?? t("containerDetail.notAvailable")} —{" "}
                            {formatDateTime(change.updatedAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-dark-brown">
                  <Pencil size={13} className="text-primary" />
                  {t("history.fieldChanges")}
                </h4>
                {fieldChanges.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("history.noFieldChanges")}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-sage/40">
                    {fieldChanges.map((change, i) => (
                      <li key={i} className="py-2.5 text-sm">
                        <p className="font-medium text-dark-brown">{change.fieldName}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                          <span className="rounded bg-sage/30 px-1.5 py-0.5">{change.oldValue ?? "-"}</span>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="rounded bg-sage/30 px-1.5 py-0.5">{change.newValue ?? "-"}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {change.updatedByName ?? t("containerDetail.notAvailable")} —{" "}
                          {formatDateTime(change.updatedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
