import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
import { landCarriersApi } from "../../api/landCarriersApi";
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
import { CONTAINER_STATUS_ORDER } from "../../types/container";
import type { UpdateContainerRequest } from "../../types/container";

export function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { canEditContainer, canEditLandCarrier, canAssignWarehouse, canTransition, isRole } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [isEditingLandCarrier, setIsEditingLandCarrier] = useState(false);
  const [landCarrierDraft, setLandCarrierDraft] = useState("");
  const [warehouseAssigneeDraft, setWarehouseAssigneeDraft] = useState("");
  const [form, setForm] = useState<{
    blNumber: string;
    shippingCompanyId: string;
    landCarrierId: string;
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
    enabled: isEditing || !!container,
  });

  const { data: ports } = useQuery({
    queryKey: ["ports", { includeInactive: false }],
    queryFn: () => portsApi.list(false),
    enabled: isEditing,
  });

  const { data: landCarriers } = useQuery({
    queryKey: ["landCarriers", { includeInactive: false }],
    queryFn: () => landCarriersApi.list(false),
    enabled: isEditing || isEditingLandCarrier,
  });

  const destinationPorts = ports?.filter((p) => p.isGuatemalan);
  // WAREHOUSE staff are assigned separately (assignWarehouse) — never eligible here.
  const eligibleOperators = operators?.filter((op) => op.role !== "WAREHOUSE");
  const warehouseUsers = operators?.filter((op) => op.role === "WAREHOUSE");

  const onRealtimeUpdate = useCallback(
    (message: { updatedByName: string }) => {
      toast(t("containerDetail.realtimeUpdated", { name: message.updatedByName }));
      queryClient.invalidateQueries({ queryKey: ["container", id] });
    },
    [queryClient, id, t],
  );
  useContainerRealtime(id, onRealtimeUpdate);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateContainerRequest) => containersApi.update(id!, payload),
    onSuccess: () => {
      toast.success(t("containerDetail.updateSuccess"));
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
        toast.error(err.response.data.message || t("containerDetail.updateError"));
      } else {
        toast.error(t("containerDetail.updateError"));
      }
    },
  });

  const landCarrierMutation = useMutation({
    mutationFn: (landCarrierId: string) =>
      containersApi.update(id!, { version: container!.version, landCarrierId: Number(landCarrierId) }),
    onSuccess: () => {
      toast.success(t("containerDetail.landCarrierUpdateSuccess"));
      queryClient.invalidateQueries({ queryKey: ["container", id] });
      setIsEditingLandCarrier(false);
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("containerDetail.landCarrierUpdateError"));
      } else {
        toast.error(t("containerDetail.landCarrierUpdateError"));
      }
    },
  });

  const assignWarehouseMutation = useMutation({
    mutationFn: (warehouseAssigneeId: string) => containersApi.assignWarehouse(id!, Number(warehouseAssigneeId)),
    onSuccess: () => {
      toast.success(t("containerDetail.warehouseAssignSuccess"));
      queryClient.invalidateQueries({ queryKey: ["container", id] });
      setWarehouseAssigneeDraft("");
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("containerDetail.warehouseAssignError"));
      } else {
        toast.error(t("containerDetail.warehouseAssignError"));
      }
    },
  });

  const pdfMutation = useMutation({
    mutationFn: () => reportsApi.containerReport(id!),
    onSuccess: (blob) => downloadBlob(blob, `contenedor-${container?.containerNumber ?? id}.pdf`),
    onError: () => toast.error(t("containerDetail.pdfError")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => containersApi.delete(id!),
    onSuccess: () => {
      toast.success(t("containerDetail.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      navigate("/containers");
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("containerDetail.deleteError"));
      } else {
        toast.error(t("containerDetail.deleteError"));
      }
      setIsDeleteOpen(false);
    },
  });

  const startEditing = () => {
    if (!container) return;
    setForm({
      blNumber: container.blNumber,
      shippingCompanyId: container.shippingCompanyId,
      landCarrierId: container.landCarrierId ?? "",
      originPort: container.originPort,
      destinationPort: container.destinationPort,
      cargoDescription: container.cargoDescription ?? "",
      responsibleOperatorId: container.responsibleOperatorId,
      estimatedDepartureDate: toGuatemalaDateInputValue(container.estimatedDepartureDate),
      internalNotes: container.internalNotes ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!container || !form) return;
    const payload: UpdateContainerRequest = { version: container.version };
    if (form.blNumber !== container.blNumber) payload.blNumber = form.blNumber;
    // Backend fields are Long — normalize both sides to number before comparing/sending,
    // since `container.*.id` and `form.*Id` (from <select>) don't reliably share a type.
    if (Number(form.shippingCompanyId) !== Number(container.shippingCompanyId))
      payload.shippingCompanyId = Number(form.shippingCompanyId);
    if (form.landCarrierId !== (container.landCarrierId ?? "") && form.landCarrierId)
      payload.landCarrierId = Number(form.landCarrierId);
    if (form.originPort !== container.originPort) payload.originPort = form.originPort;
    if (form.destinationPort !== container.destinationPort) payload.destinationPort = form.destinationPort;
    if (form.cargoDescription !== (container.cargoDescription ?? "")) payload.cargoDescription = form.cargoDescription;
    if (Number(form.responsibleOperatorId) !== Number(container.responsibleOperatorId))
      payload.responsibleOperatorId = Number(form.responsibleOperatorId);
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
    return <p className="text-gray-500">{t("containerDetail.notFound")}</p>;
  }

  const isReadOnly = container.status === "DISCHARGED";
  const transitionConfig = getTransitionConfig(container.status);
  const showTransitionButton = transitionConfig && canTransition(container);
  const showPhotoPanel = container.status === "ARRIVED_WAREHOUSE" || container.status === "DISCHARGED";
  const showDischargeButton = container.status === "ARRIVED_WAREHOUSE" && canTransition(container);
  const showDeleteButton = isRole("ADMIN") && container.status === "REGISTERED";
  const atOrPastPort = CONTAINER_STATUS_ORDER.indexOf(container.status) >= CONTAINER_STATUS_ORDER.indexOf("ARRIVED_PORT");
  // WAREHOUSE (assigned) can set the land carrier as early as ARRIVED_PORT, ahead of
  // their normal DEPARTED_PORT edit gate — this standalone control covers that gap.
  // Once general editing unlocks, the field lives in the main form instead.
  const showLandCarrierQuickEdit = !isReadOnly && !canEditContainer(container) && canEditLandCarrier(container);
  const showWarehouseAssign = !isReadOnly && atOrPastPort && canAssignWarehouse(container);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-white p-4 shadow-card sm:p-5">
        <Link to="/containers" className="text-sm font-medium text-primary hover:underline">
          &larr; {t("containerDetail.back")}
        </Link>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">
              {container.containerNumber}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">{container.shippingCompanyName}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-600">BL {container.blNumber}</span>
              <span className="text-gray-300">•</span>
              <Badge status={container.status} />
              {container.delayFlag && <Badge status="DELAY_FLAG" />}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t("containerDetail.lastUpdatedBy")}{" "}
              <span className="font-medium text-dark-brown">
                {container.lastUpdatedByName ?? t("containerDetail.notAvailable")}
              </span>{" "}
              — {formatDateTime(container.lastUpdatedAt)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            <Button variant="ghost" onClick={() => pdfMutation.mutate()} isLoading={pdfMutation.isPending}>
              <FileDown size={16} />
              {pdfMutation.isPending ? t("containerDetail.generatingPdf") : t("containerDetail.downloadPdf")}
            </Button>
            {showDeleteButton && (
              <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 size={16} />
                {t("containerDetail.delete")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card title={t("containerDetail.lifecycle")}>
        <ContainerTimeline status={container.status} delayFlag={container.delayFlag} />
        {showTransitionButton && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsTransitionOpen(true)}>{t(transitionConfig!.actionLabelKey)}</Button>
          </div>
        )}
      </Card>

      <Card
        title={t("containerDetail.info")}
        headerAction={
          canEditContainer(container) &&
          !isReadOnly &&
          (isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="text-ivory" onClick={() => setIsEditing(false)}>
                {t("containerDetail.cancel")}
              </Button>
              <Button variant="secondary" onClick={handleSave} isLoading={updateMutation.isPending}>
                {t("containerDetail.save")}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={startEditing}>
              {t("containerDetail.edit")}
            </Button>
          ))
        }
      >
        {isReadOnly && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-sage bg-sage/30 px-3 py-2.5 text-sm text-dark-brown">
            <Lock size={16} className="flex-shrink-0 text-primary" />
            {t("containerDetail.readOnlyNotice")}
          </div>
        )}

        {isEditing && form ? (
          <div className="grid grid-cols-1 gap-4 rounded-md bg-accent/10 p-4 ring-1 ring-accent/40 transition-colors sm:grid-cols-2">
            <Input
              label={t("containerDetail.blNumber")}
              value={form.blNumber}
              onChange={(e) => setForm({ ...form, blNumber: e.target.value })}
            />
            <Select
              label={t("containerDetail.shippingCompany")}
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
              label={t("containerDetail.responsibleOperator")}
              value={form.responsibleOperatorId}
              onChange={(e) => setForm({ ...form, responsibleOperatorId: e.target.value })}
            >
              {eligibleOperators?.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.fullName} ({op.role})
                </option>
              ))}
            </Select>
            <Select
              label={t("containerDetail.originPort")}
              value={form.originPort}
              onChange={(e) => setForm({ ...form, originPort: e.target.value })}
            >
              <option value="">{t("containerDetail.select")}</option>
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
              label={t("containerDetail.destinationPort")}
              value={form.destinationPort}
              onChange={(e) => setForm({ ...form, destinationPort: e.target.value })}
            >
              <option value="">{t("containerDetail.select")}</option>
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
              label={t("containerDetail.estimatedDepartureDate")}
              value={form.estimatedDepartureDate}
              onChange={(e) => setForm({ ...form, estimatedDepartureDate: e.target.value })}
            />
            <Select
              label={t("containerDetail.landCarrier")}
              value={form.landCarrierId}
              onChange={(e) => setForm({ ...form, landCarrierId: e.target.value })}
            >
              <option value="">{t("containerDetail.unassigned")}</option>
              {landCarriers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Textarea
              label={t("containerDetail.cargoDescription")}
              maxLength={500}
              rows={3}
              className="sm:col-span-2"
              value={form.cargoDescription}
              onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })}
            />
            <Textarea
              label={t("containerDetail.internalNotes")}
              maxLength={1000}
              rows={3}
              className="sm:col-span-2"
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label={t("containerDetail.shippingCompany")} value={container.shippingCompanyName} />
            <Field label={t("containerDetail.blNumber")} value={container.blNumber} />
            <Field label={t("containerDetail.responsibleOperator")} value={container.responsibleOperatorName} />
            <Field
              label={t("containerDetail.landCarrier")}
              value={container.landCarrierName || t("containerDetail.unassigned")}
            />
            <Field
              label={t("containerDetail.warehouseAssignee")}
              value={container.warehouseAssigneeName || t("containerDetail.unassigned")}
            />
            <Field label={t("containerDetail.originPort")} value={container.originPort} />
            <Field label={t("containerDetail.destinationPort")} value={container.destinationPort} />
            <Field
              label={t("containerDetail.estimatedDepartureDate")}
              value={formatDate(container.estimatedDepartureDate)}
            />
            <Field label={t("containerDetail.actualDepartureDate")} value={formatDate(container.actualDepartureDate)} />
            <Field label={t("containerDetail.actualArrivalPort")} value={formatDate(container.actualArrivalPort)} />
            <Field label={t("containerDetail.freeDaysLimit")} value={container.freeDaysLimit?.toString() ?? "-"} />
            <Field label={t("containerDetail.freeDaysExpiry")} value={formatDate(container.freeDaysExpiry)} />
            <Field label={t("containerDetail.actualDeparturePort")} value={formatDate(container.actualDeparturePort)} />
            <Field
              label={t("containerDetail.estimatedArrivalWarehouse")}
              value={formatDate(container.estimatedArrivalWarehouse)}
            />
            <Field
              label={t("containerDetail.actualArrivalWarehouse")}
              value={formatDate(container.actualArrivalWarehouse)}
            />
            <Field label={t("containerDetail.cargoDescription")} value={container.cargoDescription || "-"} full />
            <Field label={t("containerDetail.internalNotes")} value={container.internalNotes || "-"} full />
            {container.dischargeStartAt && (
              <>
                <Field label={t("containerDetail.dischargeStart")} value={formatDateTime(container.dischargeStartAt)} />
                <Field label={t("containerDetail.dischargeEnd")} value={formatDateTime(container.dischargeEndAt)} />
                <Field label={t("containerDetail.dischargeNotes")} value={container.dischargeNotes || "-"} full />
              </>
            )}
          </div>
        )}
      </Card>

      {(showLandCarrierQuickEdit || showWarehouseAssign) && (
        <Card title={t("containerDetail.portAssignments")}>
          <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap">
            {showLandCarrierQuickEdit && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("containerDetail.landCarrier")}
                </p>
                {isEditingLandCarrier ? (
                  <div className="flex items-center gap-2">
                    <Select value={landCarrierDraft} onChange={(e) => setLandCarrierDraft(e.target.value)}>
                      <option value="">{t("containerDetail.select")}</option>
                      {landCarriers?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      disabled={!landCarrierDraft}
                      isLoading={landCarrierMutation.isPending}
                      onClick={() => landCarrierMutation.mutate(landCarrierDraft)}
                    >
                      {t("containerDetail.save")}
                    </Button>
                    <Button variant="ghost" onClick={() => setIsEditingLandCarrier(false)}>
                      {t("containerDetail.cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-dark-brown">
                      {container.landCarrierName || t("containerDetail.unassigned")}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setLandCarrierDraft(container.landCarrierId ?? "");
                        setIsEditingLandCarrier(true);
                      }}
                    >
                      {t("containerDetail.edit")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {showWarehouseAssign && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("containerDetail.warehouseAssignee")}
                </p>
                <div className="flex items-center gap-2">
                  <Select value={warehouseAssigneeDraft} onChange={(e) => setWarehouseAssigneeDraft(e.target.value)}>
                    <option value="">{container.warehouseAssigneeName || t("containerDetail.select")}</option>
                    {warehouseUsers?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </Select>
                  <Button
                    disabled={!warehouseAssigneeDraft}
                    isLoading={assignWarehouseMutation.isPending}
                    onClick={() => assignWarehouseMutation.mutate(warehouseAssigneeDraft)}
                  >
                    {t("containerDetail.assign")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {showPhotoPanel && (
        <div className="flex flex-col gap-2">
          <PhotoPanel containerId={container.id} readOnly={isReadOnly} onPhotoCountChange={setPhotoCount} />
          {showDischargeButton && (
            <div className="flex justify-end">
              <Button disabled={photoCount === 0} onClick={() => setIsDischargeOpen(true)}>
                {t("containerDetail.finishDischarge")}
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
        title={t("containerDetail.editConflictTitle")}
        footer={
          <Button
            onClick={() => {
              setIsConflictOpen(false);
              setIsEditing(false);
              queryClient.invalidateQueries({ queryKey: ["container", id] });
            }}
          >
            {t("containerDetail.reload")}
          </Button>
        }
      >
        <p className="text-sm text-dark-brown">{t("containerDetail.editConflictMessage")}</p>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={t("containerDetail.deleteTitle")}
        message={t("containerDetail.deleteMessage", { number: container.containerNumber })}
        confirmLabel={t("containerDetail.delete")}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-1.5 transition-colors hover:bg-sage/15 ${full ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-dark-brown">{value}</p>
    </div>
  );
}
