import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { FileDown, FileText, CalendarRange, Filter, AlertTriangle, XCircle } from "lucide-react";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { reportsApi, downloadBlob } from "../../api/reportsApi";
import { Button, Input, Select } from "../../components/ui";
import { Card } from "../../components/ui/Card";
import { usePermissions } from "../../hooks/usePermissions";
import { statusLabel } from "../../components/ui/Badge";
import { fromGuatemalaDateInputValue, fromGuatemalaDateInputValueEndOfDay } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";

export function ReportsPage() {
  const { t } = useTranslation();
  const { canManageUsers, visibleStatuses } = usePermissions();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shippingCompanyId, setShippingCompanyId] = useState("");
  const [status, setStatus] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: false }],
    queryFn: () => shippingCompaniesApi.list(false),
  });

  const { data: operators } = useQuery({
    queryKey: ["users", { forFilter: true }],
    queryFn: () => usersApi.list({ page: 0, size: 200 }),
    enabled: canManageUsers,
  });

  const mutation = useMutation({
    mutationFn: () =>
      reportsApi.consolidatedReport({
        // Backend dateFrom/dateTo are full OffsetDateTime — a bare "YYYY-MM-DD" fails to
        // deserialize. Anchor to Guatemala midnight/end-of-day for an inclusive range.
        dateFrom: fromGuatemalaDateInputValue(dateFrom),
        dateTo: fromGuatemalaDateInputValueEndOfDay(dateTo),
        shippingCompanyId: shippingCompanyId || undefined,
        status: status || undefined,
        operatorId: operatorId || undefined,
      }),
    onSuccess: (blob) => downloadBlob(blob, `reporte-consolidado-${dateFrom}-a-${dateTo}.pdf`),
    onError: async (err) => {
      if (isAxiosError<Blob>(err) && err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text) as ApiError;
          if (parsed.error === "TOO_MANY_RESULTS" || parsed.error === "INVALID_DATE_RANGE") {
            setRangeError(parsed.message || t("reports.rangeTooWide"));
            return;
          }
          setFormError(parsed.message || t("reports.genericError"));
          return;
        } catch {
          // fall through to generic error
        }
      }
      setFormError(t("reports.genericError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRangeError(null);
    setFormError(null);
    if (dateTo < dateFrom) {
      setRangeError(t("reports.endBeforeStart"));
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">{t("reports.title")}</h1>
        <p className="text-sm text-gray-500">{t("reports.subtitle")}</p>
      </div>

      <Card
        title={
          <span className="flex items-center gap-2">
            <FileText size={18} />
            {t("reports.consolidatedReport")}
          </span>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary/70">
              <CalendarRange size={14} />
              {t("reports.dateRange")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                type="date"
                label={t("reports.from")}
                required
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                label={t("reports.to")}
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-sage/50 pt-5">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary/70">
              <Filter size={14} />
              {t("reports.optionalFilters")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label={t("reports.shippingCompany")}
                value={shippingCompanyId}
                onChange={(e) => setShippingCompanyId(e.target.value)}
              >
                <option value="">{t("reports.all")}</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select label={t("reports.status")} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{t("reports.allM")}</option>
                {visibleStatuses().map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </Select>
              {canManageUsers && (
                <Select label={t("reports.operator")} value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                  <option value="">{t("reports.allM")}</option>
                  {operators?.content.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.fullName}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </section>

          {rangeError && (
            <div className="flex items-start gap-2 rounded-md border border-accent/50 bg-[#FEF9E7] px-3 py-2.5 text-sm text-[#8a6f16]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#B8981F]" />
              <span>{rangeError}</span>
            </div>
          )}
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-[#C0392B]/40 bg-[#FADBD8] px-3 py-2.5 text-sm text-[#C0392B]">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 border-t border-sage/50 pt-5 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="relative flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-current opacity-70" />
                  </span>
                  {t("reports.generating")}
                </span>
              ) : (
                <>
                  <FileDown size={16} />
                  {t("reports.generate")}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
