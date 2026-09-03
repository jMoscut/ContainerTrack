import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { containersApi } from "../../api/containersApi";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { Badge, Button, Select } from "../../components/ui";
import { Pagination } from "../../components/shared/Pagination";
import { Spinner } from "../../components/shared/Spinner";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { usePermissions } from "../../hooks/usePermissions";
import { formatDateTime } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";
import type { Container, ContainerStatus } from "../../types/container";
import { statusLabel } from "../../components/ui/Badge";
import { ContainerFormModal } from "./ContainerFormModal";

const PAGE_SIZE = 20;

export function ContainerListPage() {
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

  const canDelete = isRole("ADMIN");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => containersApi.delete(id),
    onSuccess: () => {
      toast.success("Contenedor eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo eliminar el contenedor");
      } else {
        toast.error("No se pudo eliminar el contenedor");
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
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const allowedStatuses = visibleStatuses();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary">Contenedores</h1>
        {canCreateContainer && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus size={16} />
            Nuevo Contenedor
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-card">
        <Select
          label="Naviera"
          value={shippingCompanyId}
          onChange={(e) => {
            setShippingCompanyId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas</option>
          {companies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContainerStatus | "");
            setPage(0);
          }}
        >
          <option value="">Todos</option>
          {allowedStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        {canManageUsers && (
          <Select
            label="Operador"
            value={operatorId}
            onChange={(e) => {
              setOperatorId(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {operators?.content.map((op) => (
              <option key={op.id} value={op.id}>
                {op.fullName}
              </option>
            ))}
          </Select>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-dark-brown">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-sage bg-white px-3 py-2 text-sm text-dark-brown outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-dark-brown">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-sage bg-white px-3 py-2 text-sm text-dark-brown outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sage/40 text-dark-brown">
            <tr>
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Naviera</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Última actualización</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            )}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No hay contenedores para los filtros seleccionados.
                </td>
              </tr>
            )}
            {data?.content.map((container) => (
              <tr key={container.id} className="border-t border-sage/50">
                <td className="px-4 py-3 font-medium text-dark-brown">{container.containerNumber}</td>
                <td className="px-4 py-3 text-dark-brown">{container.shippingCompany.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge status={container.status} />
                    {container.delayFlag && <Badge status="DELAY_FLAG" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-dark-brown">
                  {container.lastUpdatedBy ? `${container.lastUpdatedBy.fullName} — ` : ""}
                  {formatDateTime(container.lastUpdatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={`/containers/${container.id}`} className="font-medium text-primary hover:underline">
                      Ver
                    </Link>
                    {canDelete && container.status === "REGISTERED" && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(container)}
                        className="font-medium text-[#C0392B] hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
      </div>

      <ContainerFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Eliminar contenedor"
        message={`¿Estás seguro de que deseas eliminar el contenedor ${deleteTarget?.containerNumber}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
