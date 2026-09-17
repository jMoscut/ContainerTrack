import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import type { Locale } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import { enUS } from "date-fns/locale/en-US";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-overrides.css";
import { containersApi } from "../../api/containersApi";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { Select } from "../../components/ui";
import { Badge, statusLabel } from "../../components/ui/Badge";
import { usePermissions } from "../../hooks/usePermissions";
import { formatDateTime } from "../../utils/dateFormat";
import { EditDateModal } from "./EditDateModal";
import type { Container, ContainerStatus } from "../../types/container";
import type { TFunction } from "i18next";

/** react-big-calendar's month grid gets cramped below this width; default to
 * the week view there instead (user can still switch back to month). */
const MOBILE_BREAKPOINT_PX = 768;

const GUATEMALA_TZ = "America/Guatemala"; // fixed UTC-6, no DST

const locales = { es, en: enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date, options?: { locale?: Locale }) => startOfWeek(date, options),
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

function buildEvents(containers: Container[], t: TFunction): ContainerCalendarEvent[] {
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
    addEvent(
      c,
      c.estimatedDepartureDate,
      "DEPARTED_ORIGIN",
      t("calendar.eventOriginDepartureEst"),
      true,
      "estimatedDepartureDate",
    );
    addEvent(c, c.actualDepartureDate, "DEPARTED_ORIGIN", t("calendar.eventOriginDepartureAct"), false);
    addEvent(c, c.actualArrivalPort, "ARRIVED_PORT", t("calendar.eventArrivedPortAct"), false);
    addEvent(
      c,
      c.estimatedArrivalWarehouse,
      "ARRIVED_WAREHOUSE",
      t("calendar.eventWarehouseArrivalEst"),
      true,
      "estimatedArrivalWarehouse",
    );
    addEvent(c, c.actualArrivalWarehouse, "ARRIVED_WAREHOUSE", t("calendar.eventWarehouseArrivalAct"), false);
    addEvent(c, c.freeDaysExpiry, "DEPARTED_PORT", t("calendar.eventFreeDaysExpiry"), true, "freeDaysExpiry");
  }

  return events;
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { visibleStatuses, canEditContainer } = usePermissions();
  const [status, setStatus] = useState<ContainerStatus | "">("");
  const [shippingCompanyId, setShippingCompanyId] = useState("");
  const [view, setView] = useState<View>(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT_PX ? "week" : "month",
  );
  const [selectedEvent, setSelectedEvent] = useState<ContainerCalendarEvent | null>(null);
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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

  const events = useMemo(() => buildEvents(data?.content ?? [], t), [data, t]);
  const activeFilterCount = [status, shippingCompanyId].filter(Boolean).length;

  const calendarMessages = useMemo(
    () => ({
      today: t("calendar.bigCalendar.today"),
      previous: t("calendar.bigCalendar.previous"),
      next: t("calendar.bigCalendar.next"),
      month: t("calendar.bigCalendar.month"),
      week: t("calendar.bigCalendar.week"),
      day: t("calendar.bigCalendar.day"),
      agenda: t("calendar.bigCalendar.agenda"),
      date: t("calendar.bigCalendar.date"),
      time: t("calendar.bigCalendar.time"),
      event: t("calendar.bigCalendar.event"),
      noEventsInRange: t("calendar.bigCalendar.noEventsInRange"),
      showMore: (count: number) => t("calendar.bigCalendar.showMore", { count }),
    }),
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">{t("calendar.title")}</h1>

      {/* Filter bar */}
      <div className="rounded-lg bg-white shadow-card">
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-dark-brown">
            <SlidersHorizontal size={16} className="text-primary" />
            {t("calendar.filters")}
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
              {t("calendar.filters")}
            </div>
            <Select
              label={t("calendar.shippingCompany")}
              value={shippingCompanyId}
              onChange={(e) => setShippingCompanyId(e.target.value)}
            >
              <option value="">{t("calendar.all")}</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label={t("calendar.status")} value={status} onChange={(e) => setStatus(e.target.value as ContainerStatus | "")}>
              <option value="">{t("calendar.allM")}</option>
              {visibleStatuses().map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="calendar-scroll-wrap flex-1 rounded-lg bg-white p-3 shadow-card sm:p-4">
          <Calendar
            key={i18n.language}
            localizer={localizer}
            culture={i18n.language}
            messages={calendarMessages}
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
          <div className="w-full flex-shrink-0 overflow-hidden rounded-lg bg-white shadow-card lg:w-72">
            <div className="flex items-center justify-between bg-primary px-4 py-3 text-ivory">
              <h3 className="font-display text-base font-semibold">{t("calendar.summary")}</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label={t("calendar.close")}
                className="rounded-full p-1 text-ivory/80 hover:bg-white/10 hover:text-ivory"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="font-display text-lg font-bold text-dark-brown">
                {selectedEvent.container.containerNumber}
              </p>
              <p className="mb-2.5 text-xs text-gray-500">{selectedEvent.container.shippingCompanyName}</p>
              <div className="mb-3 flex flex-wrap gap-1">
                <Badge status={selectedEvent.container.status} />
                {selectedEvent.container.delayFlag && <Badge status="DELAY_FLAG" />}
              </div>
              <div className="rounded-md bg-sage/20 px-3 py-2 text-xs text-dark-brown">
                <p className="font-semibold uppercase tracking-wide text-gray-500">
                  {selectedEvent.isEstimate ? t("calendar.estimatedDate") : t("calendar.actualDate")}
                </p>
                <p className="mt-0.5">{selectedEvent.fieldLabel}</p>
                <p className="mt-0.5 font-medium">{formatDateTime(selectedEvent.isoDateStr)}</p>
              </div>
              <div className="mt-4 flex flex-col items-start gap-2 border-t border-sage/50 pt-3">
                <Link
                  to={`/containers/${selectedEvent.containerId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("calendar.viewDetail")}
                </Link>
                {selectedEvent.isEstimate &&
                  selectedEvent.fieldName &&
                  canEditContainer(selectedEvent.container) &&
                  selectedEvent.container.status !== "DISCHARGED" && (
                    <button
                      type="button"
                      onClick={() => setIsEditDateOpen(true)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t("calendar.editDate")}
                    </button>
                  )}
              </div>
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
