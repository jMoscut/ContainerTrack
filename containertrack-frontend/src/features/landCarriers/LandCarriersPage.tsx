import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Power, Eye, Truck, Phone, Building2 } from "lucide-react";
import { landCarriersApi } from "../../api/landCarriersApi";
import { Button } from "../../components/ui";
import { Spinner } from "../../components/shared/Spinner";
import { StatusPill } from "../../components/shared/StatusPill";
import { MobileRowCard } from "../../components/shared/MobileRowCard";
import { EmptyState } from "../../components/shared/EmptyState";
import { usePermissions } from "../../hooks/usePermissions";
import { LandCarrierFormModal } from "./LandCarrierFormModal";
import type { LandCarrier } from "../../types/landCarrier";

export function LandCarriersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canManageLandCarriers } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<LandCarrier | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Non-admin only ever sees active carriers (same rule as navieras) — includeInactive
  // is silently ignored server-side for them regardless of what's passed here.
  const { data: carriers, isLoading } = useQuery({
    queryKey: ["landCarriers", { includeInactive: canManageLandCarriers }],
    queryFn: () => landCarriersApi.list(canManageLandCarriers),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      landCarriersApi.updateStatus(id, { isActive }),
    onSuccess: () => {
      toast.success(t("landCarriers.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["landCarriers"] });
    },
    onError: () => toast.error(t("landCarriers.statusUpdateError")),
  });

  const openCreate = () => {
    setSelectedCarrier(null);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  const openEdit = (carrier: LandCarrier) => {
    setSelectedCarrier(carrier);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  // Read-only detail: available to every role, including ADMIN (separate from Edit).
  const openView = (carrier: LandCarrier) => {
    setSelectedCarrier(carrier);
    setIsViewOnly(true);
    setIsFormOpen(true);
  };

  const isEmpty = !isLoading && carriers?.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">{t("landCarriers.title")}</h1>
          <p className="text-sm text-gray-500">{t("landCarriers.subtitle")}</p>
        </div>
        {canManageLandCarriers && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            {t("landCarriers.new")}
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
            icon={<Truck size={26} />}
            title={t("landCarriers.empty")}
            description={
              canManageLandCarriers ? t("landCarriers.emptyManage") : t("landCarriers.emptyView")
            }
            action={
              canManageLandCarriers ? (
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  {t("landCarriers.new")}
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {!isLoading && !isEmpty && (
        <>
          <div className="hidden overflow-x-auto rounded-lg bg-white shadow-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-sage/40 text-dark-brown">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("landCarriers.name")}</th>
                  <th className="px-4 py-3 font-semibold">{t("landCarriers.plate")}</th>
                  <th className="px-4 py-3 font-semibold">{t("landCarriers.phone")}</th>
                  <th className="px-4 py-3 font-semibold">{t("landCarriers.company")}</th>
                  <th className="px-4 py-3 font-semibold">{t("landCarriers.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("landCarriers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {carriers?.map((carrier) => (
                  <tr key={carrier.id} className="border-t border-sage/50 transition-colors hover:bg-sage/10">
                    <td className="px-4 py-3 font-medium text-dark-brown">{carrier.name}</td>
                    <td className="px-4 py-3 text-dark-brown">{carrier.plateNumber || "-"}</td>
                    <td className="px-4 py-3 text-dark-brown">{carrier.phone || "-"}</td>
                    <td className="px-4 py-3 text-dark-brown">{carrier.company || "-"}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={carrier.isActive ? t("landCarriers.active") : t("landCarriers.inactive")}
                        tone={carrier.isActive ? "success" : "danger"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openView(carrier)}
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <Eye size={14} />
                          {t("landCarriers.view")}
                        </button>
                        {canManageLandCarriers && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(carrier)}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Pencil size={14} />
                              {t("landCarriers.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: carrier.id, isActive: !carrier.isActive })}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Power size={14} />
                              {carrier.isActive ? t("landCarriers.deactivate") : t("landCarriers.activate")}
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

          <div className="flex flex-col gap-3 md:hidden">
            {carriers?.map((carrier) => (
              <MobileRowCard
                key={carrier.id}
                title={carrier.name}
                subtitle={carrier.plateNumber || undefined}
                badges={
                  <StatusPill
                    label={carrier.isActive ? t("landCarriers.active") : t("landCarriers.inactive")}
                    tone={carrier.isActive ? "success" : "danger"}
                  />
                }
                rows={[
                  { label: t("landCarriers.phone"), value: carrier.phone || "-", icon: <Phone size={14} /> },
                  { label: t("landCarriers.company"), value: carrier.company || "-", icon: <Building2 size={14} /> },
                ]}
                actions={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openView(carrier)}
                      aria-label={t("landCarriers.view")}
                      className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                    >
                      <Eye size={16} />
                    </button>
                    {canManageLandCarriers && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(carrier)}
                          aria-label={t("landCarriers.edit")}
                          className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: carrier.id, isActive: !carrier.isActive })}
                          aria-label={carrier.isActive ? t("landCarriers.deactivate") : t("landCarriers.activate")}
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

      <LandCarrierFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        carrier={selectedCarrier}
        readOnly={isViewOnly || !canManageLandCarriers}
      />
    </div>
  );
}
