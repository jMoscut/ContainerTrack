import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { containersApi } from "../../api/containersApi";
import { fromGuatemalaDateInputValue } from "../../utils/dateFormat";
import type { Container, ContainerStatus, TransitionRequest } from "../../types/container";
import type { ApiError } from "../../types/auth";

interface TransitionConfig {
  targetStatus: ContainerStatus;
  actionLabelKey: string;
  fields: {
    name: keyof TransitionRequest;
    labelKey: string;
    type: "date" | "text" | "number";
    required?: boolean;
  }[];
}

const TRANSITION_CONFIG: Partial<Record<ContainerStatus, TransitionConfig>> = {
  REGISTERED: {
    targetStatus: "DEPARTED_ORIGIN",
    actionLabelKey: "transition.registerDepartureOrigin",
    fields: [
      { name: "actualDepartureDate", labelKey: "transition.actualDepartureDate", type: "date", required: true },
      // Optional per CU-05.1: "puede ajustar la fecha estimada de arribo al puerto
      // guatemalteco" — also what the ARRIVED_PORT delay_flag calculation compares
      // against, so leaving it unset here means delay never gets detected later.
      { name: "estimatedArrivalPort", labelKey: "transition.estimatedArrivalPortOptional", type: "date" },
    ],
  },
  DEPARTED_ORIGIN: {
    targetStatus: "ARRIVED_PORT",
    actionLabelKey: "transition.registerArrivalPort",
    fields: [
      { name: "actualArrivalPort", labelKey: "transition.actualArrivalPort", type: "date", required: true },
      { name: "freeDaysLimitOverride", labelKey: "transition.freeDaysLimitOptional", type: "number" },
    ],
  },
  ARRIVED_PORT: {
    targetStatus: "DEPARTED_PORT",
    actionLabelKey: "transition.registerDeparturePort",
    fields: [
      { name: "actualDeparturePort", labelKey: "transition.actualDeparturePort", type: "date", required: true },
      { name: "estimatedArrivalWarehouse", labelKey: "transition.estimatedArrivalWarehouse", type: "date", required: true },
    ],
  },
  DEPARTED_PORT: {
    targetStatus: "ARRIVED_WAREHOUSE",
    actionLabelKey: "transition.registerArrivalWarehouse",
    fields: [
      { name: "actualArrivalWarehouse", labelKey: "transition.actualArrivalWarehouse", type: "date", required: true },
    ],
  },
};

export function getTransitionConfig(status: ContainerStatus): TransitionConfig | undefined {
  return TRANSITION_CONFIG[status];
}

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: Container;
}

export function TransitionModal({ isOpen, onClose, container }: TransitionModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const config = TRANSITION_CONFIG[container.status];
  const [values, setValues] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (payload: TransitionRequest) => containersApi.transition(container.id, payload),
    onSuccess: () => {
      toast.success(t("transition.success"));
      // container.id is typed string but the backend serializes it as a JSON number,
      // so it arrives as a runtime number — coerce or this silently fails to match
      // the string id ContainerDetailPage's useParams-based query key uses.
      queryClient.invalidateQueries({ queryKey: ["container", String(container.id)] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setValues({});
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("transition.error"));
      } else {
        toast.error(t("transition.error"));
      }
    },
  });

  if (!config) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extra: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = values[field.name];
      if (field.type === "number") {
        extra[field.name] = raw ? Number(raw) : undefined;
      } else if (field.type === "date") {
        // Backend expects a full OffsetDateTime, not a bare "YYYY-MM-DD" — the same
        // conversion used for container creation, otherwise every transition 400/500s.
        extra[field.name] = raw ? fromGuatemalaDateInputValue(raw) : undefined;
      } else {
        extra[field.name] = raw;
      }
    }
    const payload = { targetStatus: config.targetStatus, ...extra } as TransitionRequest;
    mutation.mutate(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(config.actionLabelKey)}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("transition.cancel")}
          </Button>
          <Button type="submit" form="transition-form" isLoading={mutation.isPending}>
            {t("transition.confirm")}
          </Button>
        </>
      }
    >
      <form id="transition-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {config.fields.map((field) => (
          <Input
            key={field.name}
            label={t(field.labelKey)}
            type={field.type}
            required={field.required}
            value={values[field.name] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
          />
        ))}
      </form>
    </Modal>
  );
}
