import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Users, Ship, Anchor, Clock3, AlertTriangle, History, ArrowUpRight } from "lucide-react";
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
  const { t } = useTranslation();
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
        toast(t("dashboard.containerUpdated", { number: message.containerNumber }));
      }
    },
    [queryClient, isAdmin, t],
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
      counts.set(c.shippingCompanyName, (counts.get(c.shippingCompanyName) ?? 0) + 1);
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
      <h1 className="font-display text-2xl font-bold tracking-tight text-primary md:text-3xl">{t("dashboard.title")}</h1>

      {isAdmin && adminSummary && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminStatCard icon={Users} label={t("dashboard.activeUsers")} value={adminSummary.activeUsersCount} />
            <AdminStatCard
              icon={Ship}
              label={t("dashboard.activeShippingCompanies")}
              value={adminSummary.activeShippingCompaniesCount}
            />
            <AdminStatCard icon={Anchor} label={t("dashboard.activePorts")} value={adminSummary.activePortsCount} />
          </div>

          <Card title={t("dashboard.topActiveUsers")}>
            {adminSummary.topActiveUsers.length === 0 ? (
              <p className="text-sm text-gray-500">{t("dashboard.noRecentActivity")}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {adminSummary.topActiveUsers.map((u) => (
                  <li
                    key={u.userId}
                    className="flex items-center justify-between border-b border-sage/40 pb-1.5 last:border-0"
                  >
                    <span className="text-dark-brown">{u.fullName}</span>
                    <span className="rounded-full bg-sage/40 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                      {t("dashboard.changes", { count: u.changeCount })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {CONTAINER_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="relative overflow-hidden rounded-lg border border-sage/30 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-elevated"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />
            <Badge status={status} className="mb-2" />
            <p className="text-2xl font-bold tabular-nums text-dark-brown">{statusCounts.get(status) ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("dashboard.expiringSoon")}>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noExpiringSoon")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {expiringSoon.map((c) => (
                <ContainerMiniRow
                  key={c.id}
                  container={c}
                  icon={Clock3}
                  highlight="gold"
                  detail={formatDate(c.freeDaysExpiry)}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dashboard.delayedContainers")}>
          {delayed.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noDelayed")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {delayed.map((c) => (
                <ContainerMiniRow
                  key={c.id}
                  container={c}
                  icon={AlertTriangle}
                  highlight="red"
                  detail={statusLabel(c.status)}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dashboard.recentUpdates")}>
          {!recentUpdates || recentUpdates.content.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noRecentUpdates")}</p>
          ) : (
            <ul className="relative flex flex-col gap-4 pl-2">
              <span aria-hidden className="absolute bottom-1 left-[11px] top-1 w-px bg-sage/60" />
              {recentUpdates.content.map((c) => (
                <li key={c.id} className="relative flex items-start gap-3 pl-6">
                  <span className="absolute left-0 top-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-ivory shadow-subtle">
                    <History size={11} />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <Link
                      to={`/containers/${c.id}`}
                      className="truncate text-sm font-medium text-primary hover:underline"
                    >
                      {c.containerNumber}
                    </Link>
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      {c.lastUpdatedByName ?? t("containerDetail.notAvailable")} — {formatDateTime(c.lastUpdatedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dashboard.byShippingCompany")}>
          <div className="overflow-x-auto">
            <BarChart data={perCompany} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function WarehouseDashboard() {
  const { t } = useTranslation();
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
      <h1 className="font-display text-2xl font-bold tracking-tight text-primary md:text-3xl">{t("dashboard.title")}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("dashboard.pendingDischarge")}>
          {loadingPending ? (
            <Spinner />
          ) : pending?.content.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noPendingDischarge")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending?.content.map((c) => (
                <ContainerMiniRow key={c.id} container={c} icon={Anchor} detail={c.destinationPort} />
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dashboard.recentDischarges")}>
          {loadingDischarged ? (
            <Spinner />
          ) : recentDischarges.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noRecentDischarges")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentDischarges.map((c) => (
                <ContainerMiniRow key={c.id} container={c} icon={History} detail={formatDateTime(c.dischargeEndAt)} />
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
    <div className="flex items-center gap-4 rounded-lg border border-sage/30 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-elevated">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-primary text-ivory shadow-subtle">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-dark-brown">{value}</p>
      </div>
    </div>
  );
}

function ContainerMiniRow({
  container,
  detail,
  highlight,
  icon: Icon,
}: {
  container: Container;
  detail: string;
  highlight?: "gold" | "red";
  icon?: typeof Clock3;
}) {
  const highlightClass =
    highlight === "gold"
      ? "bg-[#FEF9E7] hover:bg-[#FCF0C8]"
      : highlight === "red"
        ? "bg-[#FADBD8] hover:bg-[#F8C9C1]"
        : "bg-transparent hover:bg-sage/20";
  const iconClass = highlight === "gold" ? "text-accent-dark" : highlight === "red" ? "text-[#C0392B]" : "text-primary";

  return (
    <li>
      <Link
        to={`/containers/${container.id}`}
        className={`group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors duration-150 ${highlightClass}`}
      >
        {Icon && (
          <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/70 ${iconClass}`}>
            <Icon size={14} />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-primary group-hover:underline">
          {container.containerNumber}
        </span>
        <span className="flex-shrink-0 text-xs text-dark-brown">{detail}</span>
        <ArrowUpRight
          size={14}
          className="flex-shrink-0 text-dark-brown/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </Link>
    </li>
  );
}
