import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Power, Eye, Calendar, Globe, Ship } from "lucide-react";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { Button } from "../../components/ui";
import { Spinner } from "../../components/shared/Spinner";
import { StatusPill } from "../../components/shared/StatusPill";
import { MobileRowCard } from "../../components/shared/MobileRowCard";
import { EmptyState } from "../../components/shared/EmptyState";
import { usePermissions } from "../../hooks/usePermissions";
import { ShippingCompanyFormModal } from "./ShippingCompanyFormModal";
import type { ShippingCompany } from "../../types/shippingCompany";

export function ShippingCompaniesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canManageShippingCompanies } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ShippingCompany | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Non-admin only ever gets active companies back regardless of this flag —
  // enforced server-side (ShippingCompanyController) — so requesting it unconditionally
  // is harmless and avoids a second query shape per role.
  const { data: companies, isLoading } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: true }],
    queryFn: () => shippingCompaniesApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      shippingCompaniesApi.updateStatus(id, { isActive }),
    onSuccess: () => {
      toast.success(t("shippingCompanies.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["shippingCompanies"] });
    },
    onError: () => toast.error(t("shippingCompanies.statusUpdateError")),
  });

  const openCreate = () => {
    setSelectedCompany(null);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  const openEdit = (company: ShippingCompany) => {
    setSelectedCompany(company);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  // Read-only detail: available to every role, including ADMIN (separate from Edit).
  const openView = (company: ShippingCompany) => {
    setSelectedCompany(company);
    setIsViewOnly(true);
    setIsFormOpen(true);
  };

  const isEmpty = !isLoading && companies?.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">{t("shippingCompanies.title")}</h1>
          <p className="text-sm text-gray-500">
            {canManageShippingCompanies
              ? t("shippingCompanies.subtitleManage")
              : t("shippingCompanies.subtitleView")}
          </p>
        </div>
        {canManageShippingCompanies && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            {t("shippingCompanies.new")}
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
            icon={<Ship size={26} />}
            title={t("shippingCompanies.empty")}
            description={
              canManageShippingCompanies
                ? t("shippingCompanies.emptyManage")
                : t("shippingCompanies.emptyView")
            }
            action={
              canManageShippingCompanies ? (
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  {t("shippingCompanies.new")}
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
                  <th className="px-4 py-3 font-semibold">{t("shippingCompanies.name")}</th>
                  <th className="px-4 py-3 font-semibold">{t("shippingCompanies.code")}</th>
                  <th className="px-4 py-3 font-semibold">{t("shippingCompanies.country")}</th>
                  <th className="px-4 py-3 font-semibold">{t("shippingCompanies.freeDays")}</th>
                  <th className="px-4 py-3 font-semibold">{t("shippingCompanies.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("shippingCompanies.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {companies?.map((company) => (
                  <tr key={company.id} className="border-t border-sage/50 transition-colors hover:bg-sage/10">
                    <td className="px-4 py-3 font-medium text-dark-brown">{company.name}</td>
                    <td className="px-4 py-3 text-dark-brown">{company.shortCode}</td>
                    <td className="px-4 py-3 text-dark-brown">
                      <span className="flex items-center gap-1.5">
                        <Globe size={14} className="text-primary/70" />
                        {company.country}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-brown">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-primary/70" />
                        {company.freeDaysLimit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={company.isActive ? t("shippingCompanies.active") : t("shippingCompanies.inactive")}
                        tone={company.isActive ? "success" : "danger"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openView(company)}
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <Eye size={14} />
                          {t("shippingCompanies.view")}
                        </button>
                        {canManageShippingCompanies && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(company)}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Pencil size={14} />
                              {t("shippingCompanies.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: company.id, isActive: !company.isActive })}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Power size={14} />
                              {company.isActive ? t("shippingCompanies.deactivate") : t("shippingCompanies.activate")}
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
            {companies?.map((company) => (
              <MobileRowCard
                key={company.id}
                title={company.name}
                subtitle={company.shortCode}
                badges={
                  <StatusPill
                    label={company.isActive ? t("shippingCompanies.active") : t("shippingCompanies.inactive")}
                    tone={company.isActive ? "success" : "danger"}
                  />
                }
                rows={[
                  { label: t("shippingCompanies.country"), value: company.country, icon: <Globe size={14} /> },
                  { label: t("shippingCompanies.freeDays"), value: company.freeDaysLimit, icon: <Calendar size={14} /> },
                ]}
                actions={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openView(company)}
                      aria-label={t("shippingCompanies.view")}
                      className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                    >
                      <Eye size={16} />
                    </button>
                    {canManageShippingCompanies && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(company)}
                          aria-label={t("shippingCompanies.edit")}
                          className="rounded-full p-1.5 text-dark-brown/70 hover:bg-black/5 hover:text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: company.id, isActive: !company.isActive })}
                          aria-label={company.isActive ? t("shippingCompanies.deactivate") : t("shippingCompanies.activate")}
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

      <ShippingCompanyFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        company={selectedCompany}
        readOnly={isViewOnly || !canManageShippingCompanies}
      />
    </div>
  );
}
