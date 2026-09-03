import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { containersApi } from "../../api/containersApi";
import type { Container, ContainerStatus, TransitionRequest } from "../../types/container";
import type { ApiError } from "../../types/auth";

interface TransitionConfig {
  targetStatus: ContainerStatus;
  actionLabel: string;
  fields: { name: keyof TransitionRequest; label: string; type: "date" | "text" | "number" }[];
}

const TRANSITION_CONFIG: Partial<Record<ContainerStatus, TransitionConfig>> = {
  REGISTERED: {
    targetStatus: "DEPARTED_ORIGIN",
    actionLabel: "Registrar salida de origen",
    fields: [{ name: "actualDepartureDate", label: "Fecha real de salida de origen", type: "date" }],
  },
  DEPARTED_ORIGIN: {
    targetStatus: "ARRIVED_PORT",
    actionLabel: "Registrar llegada a puerto",
    fields: [
      { name: "actualArrivalPort", label: "Fecha real de llegada a puerto", type: "date" },
      { name: "freeDaysLimit", label: "Días libres permitidos", type: "number" },
    ],
  },
  ARRIVED_PORT: {
    targetStatus: "DEPARTED_PORT",
    actionLabel: "Registrar salida de puerto",
    fields: [
      { name: "actualDeparturePort", label: "Fecha real de salida de puerto", type: "date" },
      { name: "estimatedArrivalWarehouse", label: "Fecha estimada de llegada a bodega", type: "date" },
    ],
  },
  DEPARTED_PORT: {
    targetStatus: "ARRIVED_WAREHOUSE",
    actionLabel: "Registrar llegada a bodega",
    fields: [{ name: "actualArrivalWarehouse", label: "Fecha real de llegada a bodega", type: "date" }],
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
  const queryClient = useQueryClient();
  const config = TRANSITION_CONFIG[container.status];
  const [values, setValues] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (payload: TransitionRequest) => containersApi.transition(container.id, payload),
    onSuccess: () => {
      toast.success("Estado actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["container", container.id] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setValues({});
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo actualizar el estado");
      } else {
        toast.error("No se pudo actualizar el estado");
      }
    },
  });

  if (!config) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extra: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = values[field.name];
      extra[field.name] = field.type === "number" ? (raw ? Number(raw) : undefined) : raw;
    }
    const payload = { targetStatus: config.targetStatus, ...extra } as TransitionRequest;
    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.actionLabel} size="sm">
      <form id="transition-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {config.fields.map((field) => (
          <Input
            key={field.name}
            label={field.label}
            type={field.type}
            required
            value={values[field.name] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
          />
        ))}
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="transition-form" isLoading={mutation.isPending}>
          Confirmar
        </Button>
      </div>
    </Modal>
  );
}
