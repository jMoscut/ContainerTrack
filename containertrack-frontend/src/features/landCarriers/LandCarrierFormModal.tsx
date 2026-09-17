import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Textarea } from "../../components/ui";
import { landCarriersApi } from "../../api/landCarriersApi";
import type { LandCarrier } from "../../types/landCarrier";
import type { ApiError } from "../../types/auth";

interface LandCarrierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrier?: LandCarrier | null;
  /** View-only mode for non-ADMIN roles: same layout, no editing, no save action. */
  readOnly?: boolean;
}

export function LandCarrierFormModal({ isOpen, onClose, carrier, readOnly }: LandCarrierFormModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!carrier;

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("landCarriers.required")),
        plateNumber: z.string(),
        phone: z.string(),
        company: z.string(),
        notes: z.string(),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: carrier?.name ?? "",
        plateNumber: carrier?.plateNumber ?? "",
        phone: carrier?.phone ?? "",
        company: carrier?.company ?? "",
        notes: carrier?.notes ?? "",
      });
    }
  }, [isOpen, carrier, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? landCarriersApi.update(carrier!.id, values) : landCarriersApi.create(values),
    onSuccess: () => {
      toast.success(isEdit ? t("landCarriers.updateSuccess") : t("landCarriers.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["landCarriers"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("landCarriers.saveError"));
      } else {
        toast.error(t("landCarriers.saveError"));
      }
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        readOnly ? t("landCarriers.detailTitle") : isEdit ? t("landCarriers.editTitle") : t("landCarriers.newTitle")
      }
      size="md"
    >
      <form
        id="land-carrier-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <fieldset disabled={readOnly} className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
          <Input label={t("landCarriers.name")} className="sm:col-span-2" error={errors.name?.message} {...register("name")} />
          <Input label={t("landCarriers.plateNumber")} error={errors.plateNumber?.message} {...register("plateNumber")} />
          <Input label={t("landCarriers.phoneLabel")} error={errors.phone?.message} {...register("phone")} />
          <Input
            label={t("landCarriers.company")}
            className="sm:col-span-2"
            error={errors.company?.message}
            {...register("company")}
          />
          <Textarea
            label={t("landCarriers.notes")}
            rows={3}
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />
        </fieldset>
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {readOnly ? t("landCarriers.close") : t("landCarriers.cancel")}
        </Button>
        {!readOnly && (
          <Button type="submit" form="land-carrier-form" isLoading={isSubmitting || mutation.isPending}>
            {t("landCarriers.save")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
