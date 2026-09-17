import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Select, Textarea } from "../../components/ui";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import { usersApi } from "../../api/usersApi";
import { portsApi } from "../../api/portsApi";
import { landCarriersApi } from "../../api/landCarriersApi";
import { containersApi } from "../../api/containersApi";
import { CONTAINER_NUMBER_EXAMPLE, CONTAINER_NUMBER_REGEX } from "../../utils/containerValidator";
import { toIsoDate, fromGuatemalaDateInputValue } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";

interface ContainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Small uppercase section heading used to visually group related fields within the form. */
function SectionHeading({ children }: { children: string }) {
  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">{children}</p>
      <div className="mt-1 border-t border-sage/60" />
    </div>
  );
}

export function ContainerFormModal({ isOpen, onClose }: ContainerFormModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Re-derived on language change so validation messages follow the active locale.
  const schema = useMemo(
    () =>
      z.object({
        containerNumber: z
          .string()
          .toUpperCase()
          .regex(CONTAINER_NUMBER_REGEX, t("containerForm.invalidFormat", { example: CONTAINER_NUMBER_EXAMPLE })),
        blNumber: z.string().min(1, t("containerForm.required")).max(50, t("containerForm.max50")),
        shippingCompanyId: z.string().min(1, t("containerForm.selectShippingCompany")),
        landCarrierId: z.string().optional(),
        originPort: z.string().min(1, t("containerForm.required")),
        destinationPort: z.string().min(1, t("containerForm.required")),
        cargoDescription: z.string().min(1, t("containerForm.required")).max(500, t("containerForm.max500")),
        responsibleOperatorId: z.string().min(1, t("containerForm.selectOperator")),
        estimatedDepartureDate: z
          .string()
          .min(1, t("containerForm.required"))
          .refine((v) => v >= toIsoDate(new Date()), t("containerForm.noPastDates")),
        internalNotes: z.string().max(1000, t("containerForm.max1000")).optional(),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const { data: companies } = useQuery({
    queryKey: ["shippingCompanies", { includeInactive: false }],
    queryFn: () => shippingCompaniesApi.list(false),
    enabled: isOpen,
  });

  const { data: operators } = useQuery({
    queryKey: ["users", { forOperatorSelect: true }],
    queryFn: () => usersApi.listActive(),
    enabled: isOpen,
  });

  const { data: ports } = useQuery({
    queryKey: ["ports", { includeInactive: false }],
    queryFn: () => portsApi.list(false),
    enabled: isOpen,
  });

  const { data: landCarriers } = useQuery({
    queryKey: ["landCarriers", { includeInactive: false }],
    queryFn: () => landCarriersApi.list(false),
    enabled: isOpen,
  });

  const destinationPorts = ports?.filter((p) => p.isGuatemalan);
  // WAREHOUSE staff are assigned to a container separately, once it reaches port —
  // they're never eligible as the "operador responsable" that owns it from creation.
  const eligibleOperators = operators?.filter((op) => op.role !== "WAREHOUSE");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const containerNumber = watch("containerNumber") ?? "";
  const isContainerNumberValid = CONTAINER_NUMBER_REGEX.test(containerNumber.toUpperCase());

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      containersApi.create({
        ...values,
        // Backend fields are Long — <select> values are always strings, must convert.
        shippingCompanyId: Number(values.shippingCompanyId),
        landCarrierId: values.landCarrierId ? Number(values.landCarrierId) : undefined,
        responsibleOperatorId: Number(values.responsibleOperatorId),
        // Backend expects a full OffsetDateTime (e.g. "2026-09-10T06:00:00Z"), not a
        // bare date — the <input type="date"> only gives us "YYYY-MM-DD", so treat it
        // as Guatemala-local midnight and convert to the correct UTC instant.
        estimatedDepartureDate: fromGuatemalaDateInputValue(values.estimatedDepartureDate),
        internalNotes: values.internalNotes ?? "",
      }),
    onSuccess: () => {
      toast.success(t("containerForm.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      reset();
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response?.data.error === "DUPLICATE_CONTAINER") {
        setError("containerNumber", { message: err.response.data.message });
      } else if (isAxiosError<ApiError>(err) && err.response?.data.message) {
        // Surface the real backend reason (e.g. VALIDATION_ERROR field messages) instead
        // of a generic toast — previously this was silently swallowed, hiding the actual
        // cause of 400s from both the user and whoever has to debug it afterward.
        toast.error(err.response.data.message);
      } else {
        toast.error(t("containerForm.createError"));
      }
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("containerForm.newTitle")}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="container-form" isLoading={isSubmitting || mutation.isPending}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form
        id="container-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <SectionHeading>{t("containerForm.sectionIdentity")}</SectionHeading>

        <Input
          id="blNumber"
          label={t("containerForm.blNumber")}
          hint={t("containerForm.blHint")}
          error={errors.blNumber?.message}
          {...register("blNumber")}
        />
        <div className="relative">
          <Input
            id="containerNumber"
            label={t("containerForm.containerNumber")}
            placeholder={CONTAINER_NUMBER_EXAMPLE}
            className={isContainerNumberValid ? "pr-9" : undefined}
            hint={
              containerNumber && !isContainerNumberValid
                ? undefined
                : t("containerForm.containerNumberHint", { example: CONTAINER_NUMBER_EXAMPLE })
            }
            error={errors.containerNumber?.message}
            {...register("containerNumber")}
          />
          {isContainerNumberValid && (
            <CheckCircle2
              size={18}
              className="animate-modal-pop absolute right-2.5 top-[34px] text-primary"
              aria-hidden
            />
          )}
        </div>
        <Select label={t("containerForm.shippingCompany")} error={errors.shippingCompanyId?.message} {...register("shippingCompanyId")}>
          <option value="">{t("containerForm.select")}</option>
          {companies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <SectionHeading>{t("containerForm.sectionRoute")}</SectionHeading>

        <Select id="originPort" label={t("containerForm.originPort")} error={errors.originPort?.message} {...register("originPort")}>
          <option value="">{t("containerForm.select")}</option>
          {ports?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          id="destinationPort"
          label={t("containerForm.destinationPort")}
          error={errors.destinationPort?.message}
          {...register("destinationPort")}
        >
          <option value="">{t("containerForm.select")}</option>
          {destinationPorts?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>

        <SectionHeading>{t("containerForm.sectionAssignment")}</SectionHeading>

        <Select
          label={t("containerForm.responsibleOperator")}
          error={errors.responsibleOperatorId?.message}
          {...register("responsibleOperatorId")}
        >
          <option value="">{t("containerForm.select")}</option>
          {eligibleOperators?.map((op) => (
            <option key={op.id} value={op.id}>
              {op.fullName} ({op.role})
            </option>
          ))}
        </Select>
        <Input
          id="estimatedDepartureDate"
          type="date"
          label={t("containerForm.estimatedDepartureDate")}
          min={toIsoDate(new Date())}
          error={errors.estimatedDepartureDate?.message}
          {...register("estimatedDepartureDate")}
        />
        <Select
          label={t("containerForm.landCarrier")}
          error={errors.landCarrierId?.message}
          {...register("landCarrierId")}
        >
          <option value="">{t("containerForm.unassigned")}</option>
          {landCarriers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <SectionHeading>{t("containerForm.sectionAdditional")}</SectionHeading>

        <Textarea
          id="cargoDescription"
          label={t("containerForm.cargoDescription")}
          rows={3}
          maxLength={500}
          className="sm:col-span-2"
          error={errors.cargoDescription?.message}
          {...register("cargoDescription")}
        />
        <Textarea
          id="internalNotes"
          label={t("containerForm.internalNotes")}
          rows={3}
          maxLength={1000}
          className="sm:col-span-2"
          error={errors.internalNotes?.message}
          {...register("internalNotes")}
        />
      </form>
    </Modal>
  );
}
