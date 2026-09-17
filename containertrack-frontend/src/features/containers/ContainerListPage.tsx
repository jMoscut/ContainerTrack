import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Plus, SlidersHorizontal, ChevronDown, Ship, ArrowRight } from "lucide-react";
import { containersApi } from "../../api/containersApi";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { Badge, Button, Select } from "../../components/ui";
import { Pagination } from "../../components/shared/Pagination";
import { Spinner } from "../../components/shared/Spinner";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { usePermissions } from "../../hooks/usePermissions";
import { formatDateTime, fromGuatemalaDateInputValue, fromGuatemalaDateInputValueEndOfDay } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";
import type { Container, ContainerStatus } from "../../types/container";
import { statusLabel } from "../../components/ui/Badge";
import { ContainerFormModal } from "./ContainerFormModal";

const PAGE_SIZE = 20;

export function ContainerListPage() {
  const { t } = useTranslation();
  const { canCreateContainer, canManageUsers, isRole, visibleStatuses } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ContainerStatus | "">("");
  const [shippingCompanyId, setShippingCompanyId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Container | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const canDelete = isRole("ADMIN");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => containersApi.delete(id),
    onSuccess: () => {
      toast.success(t("containers.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("containers.deleteError"));
      } else {
        toast.error(t("containers.deleteError"));
      }
      setDeleteTarget(null);
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: false }],
    queryFn: () => shippingCompaniesApi.list(false),
  });

  // The operator filter is only offered to ADMIN users: GET /api/users is
  // ADMIN-only per the contract, so OPERATOR/WAREHOUSE users have no way to
  // resolve an operator list to filter by.
  const { data: operators } = useQuery({
    queryKey: ["users", { forFilter: true }],
    queryFn: () => usersApi.list({ page: 0, size: 200 }),
    enabled: canManageUsers,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["containers", { page, status, shippingCompanyId, operatorId, dateFrom, dateTo }],
    queryFn: () =>
      containersApi.list({
        page,
        size: PAGE_SIZE,
        status: status || undefined,
        shippingCompanyId: shippingCompanyId || undefined,
        operatorId: operatorId || undefined,
        // Backend dateFrom/dateTo are full OffsetDateTime query params — a bare
        // "YYYY-MM-DD" fails to bind. Anchor to Guatemala midnight/end-of-day so the
        // filter is inclusive of the whole selected range.
        dateFrom: dateFrom ? fromGuatemalaDateInputValue(dateFrom) : undefined,
        dateTo: dateTo ? fromGuatemalaDateInputValueEndOfDay(dateTo) : undefined,
      }),
  });

  const allowedStatuses = visibleStatuses();

  const activeFilterCount = [status, shippingCompanyId, operatorId, dateFrom, dateTo].filter(Boolean).length;

  const dateInputClass =
    "rounded-md border border-sage bg-white px-3 py-2 text-sm text-dark-brown outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">{t("containers.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {isLoading ? t("containers.loading") : t("containers.totalCount", { count: data?.totalElements ?? 0 })}
          </p>
        </div>
        {canCreateContainer && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus size={16} />
            {t("containers.new")}
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="rounded-lg bg-white shadow-card">
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-dark-brown">
            <SlidersHorizontal size={16} className="text-primary" />
            {t("containers.filters")}
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-dark-brown">
                {activeFilterCount}
              </span>
            )}
          </span>
          <ChevronDown
            size={18}
            className={`text-dark-brown/60 transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div className={`${isFilterPanelOpen ? "block" : "hidden"} md:block`}>
          <div className="flex flex-col gap-3 border-t border-sage/50 p-4 md:flex-row md:flex-wrap md:items-end md:border-t-0">
            <div className="hidden items-center gap-2 text-sm font-semibold text-dark-brown md:flex">
              <SlidersHorizontal size={16} className="text-primary" />
              {t("containers.filters")}
            </div>
            <Select
              label={t("containers.shippingCompany")}
              value={shippingCompanyId}
              onChange={(e) => {
                setShippingCompanyId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">{t("containers.all")}</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label={t("containers.status")}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ContainerStatus | "");
                setPage(0);
              }}
            >
              <option value="">{t("containers.allM")}</option>
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
            {canManageUsers && (
              <Select
                label={t("containers.operator")}
                value={operatorId}
                onChange={(e) => {
                  setOperatorId(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">{t("containers.allM")}</option>
                {operators?.content.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.fullName}
                  </option>
                ))}
              </Select>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark-brown">{t("containers.from")}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                className={dateInputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark-brown">{t("containers.to")}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                className={dateInputClass}
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setShippingCompanyId("");
                  setOperatorId("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(0);
                }}
                className="text-sm font-medium text-primary hover:underline md:mb-2"
              >
                {t("containers.clearFilters")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop / tablet: data table */}
      <div className="hidden overflow-hidden rounded-lg bg-white shadow-card md:block">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-sage/60 text-dark-brown backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("containers.number")}</th>
                <th className="px-4 py-3 font-semibold">{t("containers.shippingCompany")}</th>
                <th className="px-4 py-3 font-semibold">{t("containers.status")}</th>
                <th className="px-4 py-3 font-semibold">{t("containers.lastUpdate")}</th>
                <th className="px-4 py-3 font-semibold">{t("containers.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading && data?.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    {t("containers.noResults")}
                  </td>
                </tr>
              )}
              {data?.content.map((container, i) => (
                <tr
                  key={container.id}
                  className={`border-t border-sage/40 transition-colors hover:bg-sage/20 ${
                    i % 2 === 1 ? "bg-ivory/40" : "bg-white"
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-dark-brown">{container.containerNumber}</td>
                  <td className="px-4 py-3 text-dark-brown">{container.shippingCompanyName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge status={container.status} />
                      {container.delayFlag && <Badge status="DELAY_FLAG" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {container.lastUpdatedBy ? t("containers.updatedBy", { name: container.lastUpdatedByName }) + " " : ""}
                    {formatDateTime(container.lastUpdatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/containers/${container.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {t("containers.view")}
                      </Link>
                      {canDelete && container.status === "REGISTERED" && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(container)}
                          className="font-medium text-[#C0392B] hover:underline"
                        >
                          {t("containers.delete")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
      </div>

      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading && (
          <div className="flex justify-center rounded-lg bg-white py-10 shadow-card">
            <Spinner />
          </div>
        )}
        {!isLoading && data?.content.length === 0 && (
          <div className="rounded-lg bg-white px-4 py-10 text-center text-gray-500 shadow-card">
            No hay contenedores para los filtros seleccionados.
          </div>
        )}
        {data?.content.map((container) => (
          <div key={container.id} className="rounded-lg bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-base font-bold text-dark-brown">{container.containerNumber}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <Ship size={13} />
                  {container.shippingCompanyName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge status={container.status} />
                {container.delayFlag && <Badge status="DELAY_FLAG" />}
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {container.lastUpdatedBy
                ? `${t("containers.updated")} ${t("containers.updatedBy", { name: container.lastUpdatedByName })} `
                : `${t("containers.updated")} `}
              {formatDateTime(container.lastUpdatedAt)}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-sage/50 pt-3">
              <Link
                to={`/containers/${container.id}`}
                className="flex items-center gap-1 text-sm font-semibold text-primary"
              >
                {t("containers.viewDetail")}
                <ArrowRight size={14} />
              </Link>
              {canDelete && container.status === "REGISTERED" && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(container)}
                  className="text-sm font-medium text-[#C0392B]"
                >
                  {t("containers.delete")}
                </button>
              )}
            </div>
          </div>
        ))}
        {data && (
          <div className="rounded-lg bg-white shadow-card">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ContainerFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t("containers.deleteTitle")}
        message={t("containers.deleteMessage", { number: deleteTarget?.containerNumber })}
        confirmLabel={t("containers.delete")}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
