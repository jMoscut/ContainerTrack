import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import toast from "react-hot-toast";
import { Users, Ship, Anchor } from "lucide-react";
import { containersApi } from "../../api/containersApi";
import { dashboardApi } from "../../api/dashboardApi";
import { Card } from "../../components/ui/Card";
import { Badge, statusLabel } from "../../components/ui/Badge";
import { Spinner } from "../../components/shared/Spinner";
import { usePermissions } from "../../hooks/usePermissions";
import { useDashboardRealtime } from "../../hooks/useDashboardRealtime";
import { formatDate, formatDateTime } from "../../utils/dateFormat";

const GUATEMALA_TZ = "America/Guatemala"; // fixed UTC-6, no DST
import { BarChart } from "./BarChart";
import { CONTAINER_STATUS_ORDER } from "../../types/container";
import type { Container } from "../../types/container";
import type { DashboardRealtimeMessage } from "../../types/dashboard";

// There is no dedicated dashboard/stats endpoint in the API contract, so we
// pull a large page of containers once and aggregate everything client-side.
// This is fine at the expected data volume for this app; a real analytics
// endpoint would be preferable at larger scale.
const AGGREGATE_PAGE_SIZE = 1000;

export function DashboardPage() {
  const { role } = usePermissions();

  if (role === "WAREHOUSE") {
    return <WarehouseDashboard />;
  }
  return <AdminOperatorDashboard />;
}

function AdminOperatorDashboard() {
  const { role } = usePermissions();
  const isAdmin = role === "ADMIN";
  const queryClient = useQueryClient();

  const { data: allContainers, isLoading } = useQuery({
    queryKey: ["containers", { dashboardAggregate: true }],
    queryFn: () => containersApi.list({ page: 0, size: AGGREGATE_PAGE_SIZE }),
  });

  const { data: recentUpdates } = useQuery({
    queryKey: ["containers", { recentUpdates: true }],
    queryFn: () => containersApi.list({ page: 0, size: 10, sort: "lastUpdatedAt,desc" }),
  });

  const { data: adminSummary } = useQuery({
    queryKey: ["dashboard", "adminSummary"],
    queryFn: () => dashboardApi.getAdminSummary(),
    enabled: isAdmin,
  });

  const onRealtimeEvent = useCallback(
    (message: DashboardRealtimeMessage) => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      if (isAdmin) queryClient.invalidateQueries({ queryKey: ["dashboard", "adminSummary"] });
      // Keep this low-noise: only the most dashboard-relevant event (a
      // completed discharge) surfaces a toast, the rest refetch silently.
      if (message.type === "DISCHARGED") {
        toast(`Contenedor ${message.containerNumber} actualizado`);
      }
    },
    [queryClient, isAdmin],
  );
  useDashboardRealtime(onRealtimeEvent);

  const containers = useMemo(() => allContainers?.content ?? [], [allContainers]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const status of CONTAINER_STATUS_ORDER) counts.set(status, 0);
    for (const c of containers) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    return counts;
  }, [containers]);

  const expiringSoon = useMemo(() => {
    const now = toZonedTime(new Date(), GUATEMALA_TZ);
    return containers
      .filter((c) => c.freeDaysExpiry && c.status !== "DISCHARGED")
      .filter((c) => {
        const days = differenceInCalendarDays(toZonedTime(c.freeDaysExpiry!, GUATEMALA_TZ), now);
        return days >= 0 && days <= 5;
      })
      .sort((a, b) => toZonedTime(a.freeDaysExpiry!, GUATEMALA_TZ).getTime() - toZonedTime(b.freeDaysExpiry!, GUATEMALA_TZ).getTime());
  }, [containers]);

  const delayed = useMemo(() => containers.filter((c) => c.delayFlag), [containers]);

  const perCompany = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of containers) {
      counts.set(c.shippingCompany.name, (counts.get(c.shippingCompany.name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [containers]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-primary">Dashboard</h1>

      {isAdmin && adminSummary && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminStatCard icon={Users} label="Usuarios activos" value={adminSummary.activeUsersCount} />
            <AdminStatCard icon={Ship} label="Navieras activas" value={adminSummary.activeShippingCompaniesCount} />
            <AdminStatCard icon={Anchor} label="Puertos activos" value={adminSummary.activePortsCount} />
          </div>

          <Card title="Usuarios más activos (últimos 30 días)">
            {adminSummary.topActiveUsers.length === 0 ? (
              <p className="text-sm text-gray-500">Sin actividad registrada en los últimos 30 días.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {adminSummary.topActiveUsers.map((u) => (
                  <li
                    key={u.userId}
                    className="flex items-center justify-between border-b border-sage/40 pb-1 last:border-0"
                  >
                    <span className="text-dark-brown">{u.fullName}</span>
                    <span className="text-xs font-semibold text-primary">{u.changeCount} cambios</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CONTAINER_STATUS_ORDER.map((status) => (
          <div key={status} className="rounded-lg bg-white p-4 shadow-card">
            <Badge status={status} className="mb-2" />
            <p className="text-2xl font-bold text-dark-brown">{statusCounts.get(status) ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Vencimiento de días libres (próximos 5 días)">
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-gray-500">No hay contenedores próximos a vencer.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {expiringSoon.map((c) => (
                <ContainerMiniRow key={c.id} container={c} highlight="gold" detail={formatDate(c.freeDaysExpiry)} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Contenedores con retraso">
          {delayed.length === 0 ? (
            <p className="text-sm text-gray-500">No hay contenedores con retraso marcado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {delayed.map((c) => (
                <ContainerMiniRow key={c.id} container={c} highlight="red" detail={statusLabel(c.status)} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimas actualizaciones">
          {!recentUpdates || recentUpdates.content.length === 0 ? (
            <p className="text-sm text-gray-500">Sin actividad reciente.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentUpdates.content.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b border-sage/40 pb-1 last:border-0">
                  <Link to={`/containers/${c.id}`} className="text-primary hover:underline">
                    {c.containerNumber}
                  </Link>
                  <span className="text-xs text-gray-500">
                    {c.lastUpdatedBy?.fullName ?? "N/D"} — {formatDateTime(c.lastUpdatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Contenedores por naviera">
          <BarChart data={perCompany} />
        </Card>
      </div>
    </div>
  );
}

function WarehouseDashboard() {
  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ["containers", { warehousePending: true }],
    queryFn: () => containersApi.list({ page: 0, size: 200, status: "ARRIVED_WAREHOUSE" }),
  });

  const { data: discharged, isLoading: loadingDischarged } = useQuery({
    queryKey: ["containers", { warehouseDischarged: true }],
    queryFn: () => containersApi.list({ page: 0, size: 200, status: "DISCHARGED" }),
  });

  const recentDischarges = useMemo(() => {
    const now = toZonedTime(new Date(), GUATEMALA_TZ);
    return (discharged?.content ?? [])
      .filter((c) => c.dischargeEndAt && differenceInCalendarDays(now, toZonedTime(c.dischargeEndAt, GUATEMALA_TZ)) <= 7)
      .sort((a, b) => toZonedTime(b.dischargeEndAt!, GUATEMALA_TZ).getTime() - toZonedTime(a.dischargeEndAt!, GUATEMALA_TZ).getTime());
  }, [discharged]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-primary">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Pendientes de descarga">
          {loadingPending ? (
            <Spinner />
          ) : pending?.content.length === 0 ? (
            <p className="text-sm text-gray-500">No hay contenedores pendientes de descarga.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending?.content.map((c) => (
                <ContainerMiniRow key={c.id} container={c} detail={c.destinationPort} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Descargas completadas (últimos 7 días)">
          {loadingDischarged ? (
            <Spinner />
          ) : recentDischarges.length === 0 ? (
            <p className="text-sm text-gray-500">No hay descargas completadas en los últimos 7 días.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentDischarges.map((c) => (
                <ContainerMiniRow key={c.id} container={c} detail={formatDateTime(c.dischargeEndAt)} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function AdminStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/50 text-primary">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-dark-brown">{value}</p>
      </div>
    </div>
  );
}

function ContainerMiniRow({
  container,
  detail,
  highlight,
}: {
  container: Container;
  detail: string;
  highlight?: "gold" | "red";
}) {
  const highlightClass =
    highlight === "gold" ? "bg-[#FEF9E7]" : highlight === "red" ? "bg-[#FADBD8]" : "bg-transparent";

  return (
    <li className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${highlightClass}`}>
      <Link to={`/containers/${container.id}`} className="font-medium text-primary hover:underline">
        {container.containerNumber}
      </Link>
      <span className="text-xs text-dark-brown">{detail}</span>
    </li>
  );
}
