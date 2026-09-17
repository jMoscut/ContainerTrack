import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { containersApi } from "../../api/containersApi";
import { toGuatemalaDateInputValue, fromGuatemalaDateInputValue } from "../../utils/dateFormat";
import type { ApiError } from "../../types/auth";
import type { UpdateContainerRequest } from "../../types/container";

interface EditDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  containerId: string;
  containerVersion: number;
  fieldName: "estimatedDepartureDate" | "estimatedArrivalWarehouse" | "freeDaysExpiry";
  fieldLabel: string;
  currentValue: string | null;
}

/**
 * Small single-field date edit dialog for estimate fields opened from the
 * calendar side panel. Mirrors ContainerDetailPage's inline-edit PATCH
 * payload shape (version + changed field) and its EDIT_CONFLICT handling.
 */
export function EditDateModal({
  isOpen,
  onClose,
  containerId,
  containerVersion,
  fieldName,
  fieldLabel,
  currentValue,
  onSaved,
}: EditDateModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => toGuatemalaDateInputValue(currentValue));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpdateContainerRequest = {
        version: containerVersion,
        [fieldName]: fromGuatemalaDateInputValue(value),
      };
      return containersApi.update(containerId, payload);
    },
    onSuccess: () => {
      toast.success(t("editDate.success"));
      // containerId is typed string but actually arrives as a runtime number (backend
      // sends id as a JSON number) — coerce or the key silently fails to match
      // ContainerDetailPage's useParams-based (real string) query key.
      queryClient.invalidateQueries({ queryKey: ["container", String(containerId)] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      onClose();
      onSaved?.();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        if (err.response.data.error === "EDIT_CONFLICT") {
          toast.error(t("editDate.conflict"));
          queryClient.invalidateQueries({ queryKey: ["containers"] });
          onClose();
          return;
        }
        toast.error(err.response.data.message || t("editDate.error"));
      } else {
        toast.error(t("editDate.error"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("editDate.title")}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("editDate.cancel")}
          </Button>
          <Button type="submit" form="edit-date-form" isLoading={mutation.isPending}>
            {t("editDate.save")}
          </Button>
        </>
      }
    >
      <form id="edit-date-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={fieldLabel}
          type="date"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </form>
    </Modal>
  );
}
