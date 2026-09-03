import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Textarea } from "../../components/ui";
import { containersApi } from "../../api/containersApi";
import { fromGuatemalaInputValue } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";

interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
}

export function DischargeModal({ isOpen, onClose, containerId }: DischargeModalProps) {
  const queryClient = useQueryClient();
  const [dischargeStartAt, setDischargeStartAt] = useState("");
  const [dischargeEndAt, setDischargeEndAt] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      containersApi.discharge(containerId, {
        dischargeStartAt: fromGuatemalaInputValue(dischargeStartAt),
        dischargeEndAt: fromGuatemalaInputValue(dischargeEndAt),
        dischargeNotes,
      }),
    onSuccess: () => {
      toast.success("Descarga finalizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["container", containerId] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo finalizar la descarga");
      } else {
        toast.error("No se pudo finalizar la descarga");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (dischargeEndAt < dischargeStartAt) {
      setValidationError("La fecha/hora de fin debe ser posterior o igual a la de inicio.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar descarga" size="sm">
      <form id="discharge-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Inicio de descarga"
          type="datetime-local"
          required
          value={dischargeStartAt}
          onChange={(e) => setDischargeStartAt(e.target.value)}
        />
        <Input
          label="Fin de descarga"
          type="datetime-local"
          required
          value={dischargeEndAt}
          onChange={(e) => setDischargeEndAt(e.target.value)}
        />
        <Textarea
          label="Notas de descarga"
          rows={3}
          value={dischargeNotes}
          onChange={(e) => setDischargeNotes(e.target.value)}
        />
        {validationError && <p className="text-sm text-[#C0392B]">{validationError}</p>}
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="discharge-form" isLoading={mutation.isPending}>
          Finalizar descarga
        </Button>
      </div>
    </Modal>
  );
}
