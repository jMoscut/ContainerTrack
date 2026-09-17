import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Power, Eye, Anchor, Globe } from "lucide-react";
import { portsApi } from "../../api/portsApi";
import { Button } from "../../components/ui";
import { Spinner } from "../../components/shared/Spinner";
import { StatusPill } from "../../components/shared/StatusPill";
import { MobileRowCard } from "../../components/shared/MobileRowCard";
import { EmptyState } from "../../components/shared/EmptyState";
import { usePermissions } from "../../hooks/usePermissions";
import { PortFormModal } from "./PortFormModal";
import type { Port } from "../../types/port";

export function PortsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canManagePorts } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Non-admin only ever gets active ports back regardless of this flag — enforced
  // server-side (PortController) — so requesting it unconditionally is harmless.
  const { data: ports, isLoading } = useQuery({
    queryKey: ["ports", { includeInactive: true }],
    queryFn: () => portsApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => portsApi.updateStatus(id, { isActive }),
    onSuccess: () => {
      toast.success(t("ports.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
    onError: () => toast.error(t("ports.statusUpdateError")),
  });

  const openCreate = () => {
    setSelectedPort(null);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  const openEdit = (port: Port) => {
    setSelectedPort(port);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  // Read-only detail: available to every role, including ADMIN (separate from Edit).
  const openView = (port: Port) => {
    setSelectedPort(port);
    setIsViewOnly(true);
    setIsFormOpen(true);
  };

  const isEmpty = !isLoading && ports?.length === 0;

  const guatemalanBadge = (
    <StatusPill label={t("ports.guatemalan")} tone="accent" variant="outline" icon={<span aria-hidden>🇬🇹</span>} />
  );
  const foreignBadge = <StatusPill label={t("ports.foreign")} tone="neutral" variant="outline" icon={<Globe size={12} />} />;
  const originBadge = (port: Port) => (port.isGuatemalan ? guatemalanBadge : foreignBadge);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">{t("ports.title")}</h1>
          <p className="text-sm text-gray-500">
            {canManagePorts ? t("ports.subtitleManage") : t("ports.subtitleView")}
          </p>
        </div>
        {canManagePorts && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            {t("ports.new")}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center rounded-lg bg-white py-12 shadow-card">
          <Spinner />
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg bg-white shadow-card">
          <EmptyState
            icon={<Anchor size={26} />}
            title={t("ports.empty")}
            description={canManagePorts ? t("ports.emptyManage") : t("ports.emptyView")}
            action={
              canManagePorts ? (
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  {t("ports.new")}
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {!isLoading && !isEmpty && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-lg bg-white shadow-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-sage/40 text-dark-brown">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("ports.name")}</th>
                  <th className="px-4 py-3 font-semibold">{t("ports.country")}</th>
                  <th className="px-4 py-3 font-semibold">{t("ports.guatemalan")}</th>
                  <th className="px-4 py-3 font-semibold">{t("ports.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("ports.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {ports?.map((port) => (
                  <tr key={port.id} className="border-t border-sage/50 transition-colors hover:bg-sage/10">
                    <td className="px-4 py-3 font-medium text-dark-brown">{port.name}</td>
                    <td className="px-4 py-3 text-dark-brown">
                      <span className="flex items-center gap-1.5">
                        <Globe size={14} className="text-primary/70" />
                        {port.country}
                      </span>
                    </td>
                    <td className="px-4 py-3">{originBadge(port)}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={port.isActive ? t("ports.active") : t("ports.inactive")}
                        tone={port.isActive ? "success" : "danger"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openView(port)}
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <Eye size={14} />
                          {t("ports.view")}
                        </button>
                        {canManagePorts && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(port)}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Pencil size={14} />
                              {t("ports.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: port.id, isActive: !port.isActive })}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Power size={14} />
                              {port.isActive ? t("ports.deactivate") : t("ports.activate")}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {ports?.map((port) => (
              <MobileRowCard
                key={port.id}
                title={port.name}
                subtitle={port.country}
                badges={
                  <>
                    <StatusPill
                      label={port.isActive ? t("ports.active") : t("ports.inactive")}
                      tone={port.isActive ? "success" : "danger"}
                    />
                    {originBadge(port)}
                  </>
                }
                actions={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openView(port)}
                      aria-label={t("ports.view")}
                      className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                    >
                      <Eye size={16} />
                    </button>
                    {canManagePorts && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(port)}
                          aria-label={t("ports.edit")}
                          className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: port.id, isActive: !port.isActive })}
                          aria-label={port.isActive ? t("ports.deactivate") : t("ports.activate")}
                          className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                        >
                          <Power size={16} />
                        </button>
                      </>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}

      <PortFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        port={selectedPort}
        readOnly={isViewOnly || !canManagePorts}
      />
    </div>
  );
}
