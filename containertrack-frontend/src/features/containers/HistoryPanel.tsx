import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["containerHistory", containerId],
    queryFn: () => containersApi.history(containerId),
    enabled: isOpen,
  });

  return (
    <Card
      title={
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setIsOpen((v) => !v)}
        >
          <span>Historial</span>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      }
    >
      {isOpen && (
        <div className="flex flex-col gap-6">
          {isLoading && <Spinner />}

          {data && (
            <>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-dark-brown">Cambios de estado</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="py-1 pr-3">De</th>
                        <th className="py-1 pr-3">A</th>
                        <th className="py-1 pr-3">Por</th>
                        <th className="py-1 pr-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.statusChanges.map((change, i) => (
                        <tr key={i} className="border-t border-sage/40">
                          <td className="py-1 pr-3">{safeStatusLabel(change.oldValue)}</td>
                          <td className="py-1 pr-3">{safeStatusLabel(change.newValue)}</td>
                          <td className="py-1 pr-3">{change.performedBy.fullName}</td>
                          <td className="py-1 pr-3">{formatDateTime(change.performedAt)}</td>
                        </tr>
                      ))}
                      {data.statusChanges.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-2 text-gray-500">
                            Sin cambios de estado registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-dark-brown">Cambios de campos</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="py-1 pr-3">Campo</th>
                        <th className="py-1 pr-3">Anterior</th>
                        <th className="py-1 pr-3">Nuevo</th>
                        <th className="py-1 pr-3">Por</th>
                        <th className="py-1 pr-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fieldChanges.map((change, i) => (
                        <tr key={i} className="border-t border-sage/40">
                          <td className="py-1 pr-3">{change.fieldName}</td>
                          <td className="py-1 pr-3">{change.oldValue ?? "-"}</td>
                          <td className="py-1 pr-3">{change.newValue ?? "-"}</td>
                          <td className="py-1 pr-3">{change.updatedBy.fullName}</td>
                          <td className="py-1 pr-3">{formatDateTime(change.updatedAt)}</td>
                        </tr>
                      ))}
                      {data.fieldChanges.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-2 text-gray-500">
                            Sin cambios de campos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
