import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { portsApi } from "../../api/portsApi";
import type { Port } from "../../types/port";
import type { ApiError } from "../../types/auth";

interface PortFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  port?: Port | null;
  /** View-only mode for non-ADMIN roles: same layout, no editing, no save action. */
  readOnly?: boolean;
}

export function PortFormModal({ isOpen, onClose, port, readOnly }: PortFormModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!port;

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("ports.required")),
        country: z.string().min(1, t("ports.required")),
        isGuatemalan: z.boolean(),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const isGuatemalan = watch("isGuatemalan");

  useEffect(() => {
    if (isOpen) {
      reset(
        port
          ? { name: port.name, country: port.country, isGuatemalan: port.isGuatemalan }
          : { name: "", country: "", isGuatemalan: false },
      );
    }
  }, [isOpen, port, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? portsApi.update(port!.id, values) : portsApi.create(values)),
    onSuccess: () => {
      toast.success(isEdit ? t("ports.updateSuccess") : t("ports.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["ports"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("ports.saveError"));
      } else {
        toast.error(t("ports.saveError"));
      }
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={readOnly ? t("ports.detailTitle") : isEdit ? t("ports.editTitle") : t("ports.newTitle")}
      size="sm"
    >
      <form
        id="port-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Input label={t("ports.name")} error={errors.name?.message} {...register("name")} />
          <Input label={t("ports.country")} error={errors.country?.message} {...register("country")} />
          <label
            className={`flex items-center justify-between gap-3 rounded-md border p-3 transition-colors ${
              readOnly ? "cursor-default" : "cursor-pointer"
            } ${isGuatemalan ? "border-primary bg-primary/5" : "border-sage bg-white hover:border-primary/40"}`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-lg">
                🇬🇹
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-dark-brown">{t("ports.guatemalanPort")}</span>
                <span className="text-xs text-gray-500">{t("ports.guatemalanHint")}</span>
              </span>
            </span>
            <input type="checkbox" className="h-4 w-4 accent-primary" {...register("isGuatemalan")} />
          </label>
        </fieldset>
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {readOnly ? t("ports.close") : t("ports.cancel")}
        </Button>
        {!readOnly && (
          <Button type="submit" form="port-form" isLoading={isSubmitting || mutation.isPending}>
            {t("ports.save")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
