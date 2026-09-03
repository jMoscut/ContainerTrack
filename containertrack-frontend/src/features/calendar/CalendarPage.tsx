import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { containersApi } from "../../api/containersApi";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { Select } from "../../components/ui";
import { Badge, statusLabel } from "../../components/ui/Badge";
import { usePermissions } from "../../hooks/usePermissions";
import { formatDateTime } from "../../utils/dateFormat";
import { EditDateModal } from "./EditDateModal";
import type { Container, ContainerStatus } from "../../types/container";

const GUATEMALA_TZ = "America/Guatemala"; // fixed UTC-6, no DST

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales,
});

const STATUS_COLORS: Record<ContainerStatus, string> = {
  REGISTERED: "#C8D5C0",
  DEPARTED_ORIGIN: "#D4AF37",
  ARRIVED_PORT: "#006850",
  DEPARTED_PORT: "#004F2E",
  ARRIVED_WAREHOUSE: "#006850",
  DISCHARGED: "#004F2E",
};

/** Estimate fields that may be edited from the calendar side panel, per the same rules as ContainerDetailPage's inline edit. */
type EditableEstimateField = "estimatedDepartureDate" | "estimatedArrivalWarehouse" | "freeDaysExpiry";

interface ContainerCalendarEvent {
  id: string;
  containerId: string;
  title: string;
  start: Date;
  end: Date;
  /** Original UTC ISO string this event's date was built from (for display via formatDateTime). */
  isoDateStr: string;
  status: ContainerStatus;
  isEstimate: boolean;
  /** Set only for estimate events that map to a directly editable container field. */
  fieldName?: EditableEstimateField;
  fieldLabel: string;
  container: Container;
}

function buildEvents(containers: Container[]): ContainerCalendarEvent[] {
  const events: ContainerCalendarEvent[] = [];

  const addEvent = (
    container: Container,
    dateStr: string | null,
    status: ContainerStatus,
    label: string,
    isEstimate: boolean,
    fieldName?: EditableEstimateField,
  ) => {
    if (!dateStr) return;
    const date = toZonedTime(dateStr, GUATEMALA_TZ);
    if (Number.isNaN(date.getTime())) return;
    events.push({
      id: `${container.id}-${status}-${isEstimate ? "est" : "act"}`,
      containerId: container.id,
      title: `${container.containerNumber} — ${label}`,
      start: date,
      end: date,
      isoDateStr: dateStr,
      status,
      isEstimate,
      fieldName,
      fieldLabel: label,
      container,
    });
  };

  for (const c of containers) {
    addEvent(c, c.estimatedDepartureDate, "DEPARTED_ORIGIN", "Salida estimada de origen", true, "estimatedDepartureDate");
    addEvent(c, c.actualDepartureDate, "DEPARTED_ORIGIN", "Salida real de origen", false);
    addEvent(c, c.actualArrivalPort, "ARRIVED_PORT", "Llegada real a puerto", false);
    addEvent(
      c,
      c.estimatedArrivalWarehouse,
      "ARRIVED_WAREHOUSE",
      "Llegada estimada a bodega",
      true,
      "estimatedArrivalWarehouse",
    );
    addEvent(c, c.actualArrivalWarehouse, "ARRIVED_WAREHOUSE", "Llegada real a bodega", false);
    addEvent(c, c.freeDaysExpiry, "DEPARTED_PORT", "Vencimiento días libres", true, "freeDaysExpiry");
  }

  return events;
}

export function CalendarPage() {
  const { visibleStatuses, canEditContainer } = usePermissions();
  const [status, setStatus] = useState<ContainerStatus | "">("");
  const [shippingCompanyId, setShippingCompanyId] = useState("");
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<ContainerCalendarEvent | null>(null);
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: false }],
    queryFn: () => shippingCompaniesApi.list(false),
  });

  const { data } = useQuery({
    queryKey: ["containers", { calendar: true, status, shippingCompanyId }],
    queryFn: () =>
      containersApi.list({
        page: 0,
        size: 500,
        status: status || undefined,
        shippingCompanyId: shippingCompanyId || undefined,
      }),
  });

  const events = useMemo(() => buildEvents(data?.content ?? []), [data]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-primary">Calendario</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-card">
        <Select label="Naviera" value={shippingCompanyId} onChange={(e) => setShippingCompanyId(e.target.value)}>
          <option value="">Todas</option>
          {companies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as ContainerStatus | "")}>
          <option value="">Todos</option>
          {visibleStatuses().map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-lg bg-white p-4 shadow-card">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650 }}
            views={["month", "week", "day"]}
            view={view}
            onView={setView}
            getNow={() => toZonedTime(new Date(), GUATEMALA_TZ)}
            onSelectEvent={(event) => setSelectedEvent(event as ContainerCalendarEvent)}
            eventPropGetter={(event) => {
              const e = event as ContainerCalendarEvent;
              const color = STATUS_COLORS[e.status];
              return {
                style: {
                  backgroundColor: color,
                  color: e.status === "REGISTERED" || e.status === "DEPARTED_ORIGIN" ? "#2E2417" : "#FDFDD0",
                  border: e.isEstimate ? `2px dashed ${color}` : `2px solid ${color}`,
                  opacity: e.isEstimate ? 0.85 : 1,
                },
              };
            }}
          />
        </div>

        {selectedEvent && (
          <div className="w-72 flex-shrink-0 rounded-lg bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-primary">Resumen</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-sm text-gray-500 hover:text-dark-brown"
              >
                Cerrar
              </button>
            </div>
            <p className="mb-1 text-sm font-medium text-dark-brown">
              {selectedEvent.container.containerNumber}
            </p>
            <p className="mb-2 text-xs text-gray-500">{selectedEvent.container.shippingCompany.name}</p>
            <div className="mb-2 flex gap-1">
              <Badge status={selectedEvent.container.status} />
              {selectedEvent.container.delayFlag && <Badge status="DELAY_FLAG" />}
            </div>
            <p className="mb-1 text-xs text-gray-500">
              {selectedEvent.isEstimate ? "Fecha estimada" : "Fecha real"}: {formatDateTime(selectedEvent.isoDateStr)}
            </p>
            <div className="mt-3 flex flex-col items-start gap-2">
              <Link
                to={`/containers/${selectedEvent.containerId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver detalle &rarr;
              </Link>
              {selectedEvent.isEstimate &&
                selectedEvent.fieldName &&
                canEditContainer &&
                selectedEvent.container.status !== "DISCHARGED" && (
                  <button
                    type="button"
                    onClick={() => setIsEditDateOpen(true)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Editar fecha
                  </button>
                )}
            </div>
          </div>
        )}
      </div>

      {selectedEvent?.fieldName && (
        <EditDateModal
          isOpen={isEditDateOpen}
          onClose={() => setIsEditDateOpen(false)}
          onSaved={() => setSelectedEvent(null)}
          containerId={selectedEvent.containerId}
          containerVersion={selectedEvent.container.version}
          fieldName={selectedEvent.fieldName}
          fieldLabel={selectedEvent.fieldLabel}
          currentValue={selectedEvent.isoDateStr}
        />
      )}
    </div>
  );
}
