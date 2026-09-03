import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { FileDown, Lock, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge, Button, Input, Select, Textarea } from "../../components/ui";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/shared/Spinner";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { containersApi } from "../../api/containersApi";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { portsApi } from "../../api/portsApi";
import { reportsApi, downloadBlob } from "../../api/reportsApi";
import { usePermissions } from "../../hooks/usePermissions";
import { useContainerRealtime } from "../../hooks/useContainerRealtime";
import { formatDate, formatDateTime, toGuatemalaDateInputValue, fromGuatemalaDateInputValue } from "../../utils/dateFormat";
import { ContainerTimeline } from "./ContainerTimeline";
import { TransitionModal, getTransitionConfig } from "./TransitionModal";
import { DischargeModal } from "./DischargeModal";
import { PhotoPanel } from "./PhotoPanel";
import { HistoryPanel } from "./HistoryPanel";
import type { ApiError } from "../../types/auth";
import type { UpdateContainerRequest } from "../../types/container";

export function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canEditContainer, canTransition, isRole } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [form, setForm] = useState<{
    shippingCompanyId: string;
    originPort: string;
    destinationPort: string;
    cargoDescription: string;
    responsibleOperatorId: string;
    estimatedDepartureDate: string;
    internalNotes: string;
  } | null>(null);

  const { data: container, isLoading } = useQuery({
    queryKey: ["container", id],
    queryFn: () => containersApi.get(id!),
    enabled: !!id,
  });

  const { data: companies } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: true }],
    queryFn: () => shippingCompaniesApi.list(true),
    enabled: isEditing,
  });

  const { data: operators } = useQuery({
    queryKey: ["users", { forOperatorSelect: true }],
    queryFn: () => usersApi.listActive(),
    enabled: isEditing,
  });

  const { data: ports } = useQuery({
    queryKey: ["ports", { includeInactive: false }],
    queryFn: () => portsApi.list(false),
    enabled: isEditing,
  });

  const destinationPorts = ports?.filter((p) => p.isGuatemalan);

  const onRealtimeUpdate = useCallback(
    (message: { updatedByName: string }) => {
      toast(`${message.updatedByName} actualizó este contenedor`);
      queryClient.invalidateQueries({ queryKey: ["container", id] });
    },
    [queryClient, id],
  );
  useContainerRealtime(id, onRealtimeUpdate);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateContainerRequest) => containersApi.update(id!, payload),
    onSuccess: () => {
      toast.success("Contenedor actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["container", id] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setIsEditing(false);
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        if (err.response.data.error === "EDIT_CONFLICT") {
          setIsConflictOpen(true);
          return;
        }
        toast.error(err.response.data.message || "No se pudo actualizar el contenedor");
      } else {
        toast.error("No se pudo actualizar el contenedor");
      }
    },
  });

  const pdfMutation = useMutation({
    mutationFn: () => reportsApi.containerReport(id!),
    onSuccess: (blob) => downloadBlob(blob, `contenedor-${container?.containerNumber ?? id}.pdf`),
    onError: () => toast.error("No se pudo generar el reporte PDF"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => containersApi.delete(id!),
    onSuccess: () => {
      toast.success("Contenedor eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      navigate("/containers");
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo eliminar el contenedor");
      } else {
        toast.error("No se pudo eliminar el contenedor");
      }
      setIsDeleteOpen(false);
    },
  });

  const startEditing = () => {
    if (!container) return;
    setForm({
      shippingCompanyId: container.shippingCompany.id,
      originPort: container.originPort,
      destinationPort: container.destinationPort,
      cargoDescription: container.cargoDescription ?? "",
      responsibleOperatorId: container.responsibleOperator.id,
      estimatedDepartureDate: toGuatemalaDateInputValue(container.estimatedDepartureDate),
      internalNotes: container.internalNotes ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!container || !form) return;
    const payload: UpdateContainerRequest = { version: container.version };
    if (form.shippingCompanyId !== container.shippingCompany.id) payload.shippingCompanyId = form.shippingCompanyId;
    if (form.originPort !== container.originPort) payload.originPort = form.originPort;
    if (form.destinationPort !== container.destinationPort) payload.destinationPort = form.destinationPort;
    if (form.cargoDescription !== (container.cargoDescription ?? "")) payload.cargoDescription = form.cargoDescription;
    if (form.responsibleOperatorId !== container.responsibleOperator.id)
      payload.responsibleOperatorId = form.responsibleOperatorId;
    if (form.estimatedDepartureDate !== toGuatemalaDateInputValue(container.estimatedDepartureDate))
      payload.estimatedDepartureDate = fromGuatemalaDateInputValue(form.estimatedDepartureDate);
    if (form.internalNotes !== (container.internalNotes ?? "")) payload.internalNotes = form.internalNotes;

    updateMutation.mutate(payload);
  };

  useEffect(() => {
    setIsEditing(false);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!container) {
    return <p className="text-gray-500">No se encontró el contenedor.</p>;
  }

  const isReadOnly = container.status === "DISCHARGED";
  const transitionConfig = getTransitionConfig(container.status);
  const showTransitionButton = transitionConfig && canTransition(container.status);
  const showPhotoPanel = container.status === "ARRIVED_WAREHOUSE" || container.status === "DISCHARGED";
  const showDischargeButton = container.status === "ARRIVED_WAREHOUSE" && canTransition("ARRIVED_WAREHOUSE");
  const showDeleteButton = isRole("ADMIN") && container.status === "REGISTERED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/containers" className="text-sm text-primary hover:underline">
            &larr; Volver a contenedores
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-primary">{container.containerNumber}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={container.status} />
          {container.delayFlag && <Badge status="DELAY_FLAG" />}
          <Button variant="ghost" onClick={() => pdfMutation.mutate()} isLoading={pdfMutation.isPending}>
            <FileDown size={16} />
            {pdfMutation.isPending ? "Generando PDF..." : "Descargar PDF"}
          </Button>
          {showDeleteButton && (
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 size={16} />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md bg-white px-4 py-2 text-sm text-gray-600 shadow-card">
        Última actualización por{" "}
        <span className="font-medium text-dark-brown">{container.lastUpdatedBy?.fullName ?? "N/D"}</span> —{" "}
        {formatDateTime(container.lastUpdatedAt)}
      </div>

      <Card title="Ciclo de vida">
        <ContainerTimeline status={container.status} delayFlag={container.delayFlag} />
        {showTransitionButton && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsTransitionOpen(true)}>{transitionConfig!.actionLabel}</Button>
          </div>
        )}
      </Card>

      <Card
        title="Información del contenedor"
        headerAction={
          canEditContainer &&
          !isReadOnly &&
          (isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="text-ivory" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button variant="secondary" onClick={handleSave} isLoading={updateMutation.isPending}>
                Guardar
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={startEditing}>
              Editar
            </Button>
          ))
        }
      >
        {isReadOnly && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-sage/40 px-3 py-2 text-sm text-dark-brown">
            <Lock size={16} />
            Solo lectura: este contenedor ya fue descargado y su información no puede modificarse.
          </div>
        )}

        {isEditing && form ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Naviera"
              value={form.shippingCompanyId}
              onChange={(e) => setForm({ ...form, shippingCompanyId: e.target.value })}
            >
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="Operador responsable"
              value={form.responsibleOperatorId}
              onChange={(e) => setForm({ ...form, responsibleOperatorId: e.target.value })}
            >
              {operators?.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.fullName} ({op.role})
                </option>
              ))}
            </Select>
            <Select
              label="Puerto de origen"
              value={form.originPort}
              onChange={(e) => setForm({ ...form, originPort: e.target.value })}
            >
              <option value="">Selecciona...</option>
              {ports?.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
              {form.originPort && !ports?.some((p) => p.name === form.originPort) && (
                <option value={form.originPort}>{form.originPort}</option>
              )}
            </Select>
            <Select
              label="Puerto de destino"
              value={form.destinationPort}
              onChange={(e) => setForm({ ...form, destinationPort: e.target.value })}
            >
              <option value="">Selecciona...</option>
              {destinationPorts?.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
              {form.destinationPort && !destinationPorts?.some((p) => p.name === form.destinationPort) && (
                <option value={form.destinationPort}>{form.destinationPort}</option>
              )}
            </Select>
            <Input
              type="date"
              label="Fecha estimada de salida"
              value={form.estimatedDepartureDate}
              onChange={(e) => setForm({ ...form, estimatedDepartureDate: e.target.value })}
            />
            <Textarea
              label="Descripción de la carga"
              maxLength={500}
              rows={3}
              className="sm:col-span-2"
              value={form.cargoDescription}
              onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })}
            />
            <Textarea
              label="Notas internas"
              maxLength={1000}
              rows={3}
              className="sm:col-span-2"
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Naviera" value={container.shippingCompany.name} />
            <Field label="Operador responsable" value={container.responsibleOperator.fullName} />
            <Field label="Puerto de origen" value={container.originPort} />
            <Field label="Puerto de destino" value={container.destinationPort} />
            <Field label="Fecha estimada de salida" value={formatDate(container.estimatedDepartureDate)} />
            <Field label="Fecha real de salida de origen" value={formatDate(container.actualDepartureDate)} />
            <Field label="Fecha real de llegada a puerto" value={formatDate(container.actualArrivalPort)} />
            <Field label="Días libres" value={container.freeDaysLimit?.toString() ?? "-"} />
            <Field label="Vencimiento días libres" value={formatDate(container.freeDaysExpiry)} />
            <Field label="Fecha real de salida de puerto" value={formatDate(container.actualDeparturePort)} />
            <Field
              label="Fecha estimada de llegada a bodega"
              value={formatDate(container.estimatedArrivalWarehouse)}
            />
            <Field label="Fecha real de llegada a bodega" value={formatDate(container.actualArrivalWarehouse)} />
            <Field label="Descripción de la carga" value={container.cargoDescription || "-"} full />
            <Field label="Notas internas" value={container.internalNotes || "-"} full />
          </div>
        )}
      </Card>

      {showPhotoPanel && (
        <div className="flex flex-col gap-2">
          <PhotoPanel containerId={container.id} readOnly={isReadOnly} onPhotoCountChange={setPhotoCount} />
          {showDischargeButton && (
            <div className="flex justify-end">
              <Button disabled={photoCount === 0} onClick={() => setIsDischargeOpen(true)}>
                Finalizar descarga
              </Button>
            </div>
          )}
        </div>
      )}

      <HistoryPanel containerId={container.id} />

      {isTransitionOpen && (
        <TransitionModal isOpen={isTransitionOpen} onClose={() => setIsTransitionOpen(false)} container={container} />
      )}
      {isDischargeOpen && (
        <DischargeModal isOpen={isDischargeOpen} onClose={() => setIsDischargeOpen(false)} containerId={container.id} />
      )}

      <Modal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        title="Conflicto de edición"
        footer={
          <Button
            onClick={() => {
              setIsConflictOpen(false);
              setIsEditing(false);
              queryClient.invalidateQueries({ queryKey: ["container", id] });
            }}
          >
            Recargar
          </Button>
        }
      >
        <p className="text-sm text-dark-brown">
          Otro usuario modificó este contenedor mientras editabas. Recarga para ver los cambios actuales.
        </p>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar contenedor"
        message={`¿Estás seguro de que deseas eliminar el contenedor ${container.containerNumber}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-dark-brown">{value}</p>
    </div>
  );
}
