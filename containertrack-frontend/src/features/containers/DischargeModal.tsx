import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.success(t("discharge.success"));
      // containerId is typed string but actually arrives as a runtime number (backend
      // sends id as a JSON number) — coerce or the key silently fails to match
      // ContainerDetailPage's useParams-based (real string) query key.
      queryClient.invalidateQueries({ queryKey: ["container", String(containerId)] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("discharge.error"));
      } else {
        toast.error(t("discharge.error"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (dischargeEndAt < dischargeStartAt) {
      setValidationError(t("discharge.endBeforeStart"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("discharge.title")}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("discharge.cancel")}
          </Button>
          <Button type="submit" form="discharge-form" isLoading={mutation.isPending}>
            {t("discharge.finish")}
          </Button>
        </>
      }
    >
      <form id="discharge-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">{t("discharge.window")}</p>
          <div className="flex flex-col gap-4 border-l-2 border-sage/60 pl-3">
            <Input
              label={t("discharge.start")}
              type="datetime-local"
              required
              value={dischargeStartAt}
              onChange={(e) => setDischargeStartAt(e.target.value)}
            />
            <Input
              label={t("discharge.end")}
              type="datetime-local"
              required
              value={dischargeEndAt}
              onChange={(e) => setDischargeEndAt(e.target.value)}
            />
          </div>
        </div>
        <Textarea
          label={t("discharge.notes")}
          rows={3}
          value={dischargeNotes}
          onChange={(e) => setDischargeNotes(e.target.value)}
        />
        {validationError && (
          <p className="rounded-md bg-[#FADBD8] px-3 py-2 text-sm font-medium text-[#C0392B]">{validationError}</p>
        )}
      </form>
    </Modal>
  );
}
