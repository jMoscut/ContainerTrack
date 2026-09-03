import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { FileDown } from "lucide-react";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { reportsApi, downloadBlob } from "../../api/reportsApi";
import { Button, Input, Select } from "../../components/ui";
import { Card } from "../../components/ui/Card";
import { usePermissions } from "../../hooks/usePermissions";
import { statusLabel } from "../../components/ui/Badge";
import type { ApiError } from "../../types/auth";

export function ReportsPage() {
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
        dateFrom,
        dateTo,
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
          if (parsed.error === "TOO_MANY_RESULTS") {
            setRangeError(parsed.message || "El rango de fechas es demasiado amplio. Intenta acotarlo.");
            return;
          }
          setFormError(parsed.message || "No se pudo generar el reporte");
          return;
        } catch {
          // fall through to generic error
        }
      }
      setFormError("No se pudo generar el reporte");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRangeError(null);
    setFormError(null);
    mutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-primary">Reportes</h1>

      <Card title="Reporte consolidado">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label="Desde"
            required
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input type="date" label="Hasta" required value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Select label="Naviera (opcional)" value={shippingCompanyId} onChange={(e) => setShippingCompanyId(e.target.value)}>
            <option value="">Todas</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Estado (opcional)" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {visibleStatuses().map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          {canManageUsers && (
            <Select label="Operador (opcional)" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
              <option value="">Todos</option>
              {operators?.content.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.fullName}
                </option>
              ))}
            </Select>
          )}

          {rangeError && (
            <div className="sm:col-span-2 rounded-md bg-[#FEF9E7] px-3 py-2 text-sm text-[#B8981F]">{rangeError}</div>
          )}
          {formError && (
            <div className="sm:col-span-2 rounded-md bg-[#FADBD8] px-3 py-2 text-sm text-[#C0392B]">{formError}</div>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" isLoading={mutation.isPending}>
              <FileDown size={16} />
              {mutation.isPending ? "Generando PDF..." : "Generar Reporte PDF"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
