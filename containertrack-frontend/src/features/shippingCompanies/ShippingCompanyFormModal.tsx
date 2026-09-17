import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Textarea } from "../../components/ui";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import type { ShippingCompany } from "../../types/shippingCompany";
import type { ApiError } from "../../types/auth";

interface ShippingCompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: ShippingCompany | null;
  /** View-only mode for non-ADMIN roles: same layout, no editing, no save action. */
  readOnly?: boolean;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-primary/70">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ShippingCompanyFormModal({ isOpen, onClose, company, readOnly }: ShippingCompanyFormModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!company;

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("shippingCompanies.required")),
        shortCode: z.string().min(1, t("shippingCompanies.required")),
        country: z.string().min(1, t("shippingCompanies.required")),
        contactEmail: z.string().email(t("shippingCompanies.invalidEmail")).or(z.literal("")),
        contactPhone: z.string(),
        notes: z.string(),
        freeDaysLimit: z.number().int().min(0, t("shippingCompanies.minZero")),
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
      reset(
        company
          ? {
              name: company.name,
              shortCode: company.shortCode,
              country: company.country,
              contactEmail: company.contactEmail,
              contactPhone: company.contactPhone,
              notes: company.notes,
              freeDaysLimit: company.freeDaysLimit ?? 0,
            }
          : { name: "", shortCode: "", country: "", contactEmail: "", contactPhone: "", notes: "", freeDaysLimit: 0 },
      );
    }
  }, [isOpen, company, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? shippingCompaniesApi.update(company!.id, values) : shippingCompaniesApi.create(values),
    onSuccess: () => {
      toast.success(isEdit ? t("shippingCompanies.updateSuccess") : t("shippingCompanies.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["shippingCompanies"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("shippingCompanies.saveError"));
      } else {
        toast.error(t("shippingCompanies.saveError"));
      }
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        readOnly
          ? t("shippingCompanies.detailTitle")
          : isEdit
            ? t("shippingCompanies.editTitle")
            : t("shippingCompanies.newTitle")
      }
      size="md"
    >
      <form
        id="shipping-company-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        <fieldset disabled={readOnly} className="flex flex-col gap-5">
          <FormSection title={t("shippingCompanies.sectionIdentity")}>
            <Input label={t("shippingCompanies.name")} error={errors.name?.message} {...register("name")} />
            <Input label={t("shippingCompanies.code")} error={errors.shortCode?.message} {...register("shortCode")} />
            <Input label={t("shippingCompanies.country")} error={errors.country?.message} {...register("country")} />
          </FormSection>

          <FormSection title={t("shippingCompanies.sectionContact")}>
            <Input
              label={t("shippingCompanies.contactEmail")}
              type="email"
              error={errors.contactEmail?.message}
              {...register("contactEmail")}
            />
            <Input
              label={t("shippingCompanies.contactPhone")}
              error={errors.contactPhone?.message}
              {...register("contactPhone")}
            />
          </FormSection>

          <FormSection title={t("shippingCompanies.sectionOperational")}>
            <Input
              label={t("shippingCompanies.freeDays")}
              type="number"
              min={0}
              hint={t("shippingCompanies.freeDaysHint")}
              error={errors.freeDaysLimit?.message}
              {...register("freeDaysLimit", { valueAsNumber: true })}
            />
          </FormSection>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary/70">
              {t("shippingCompanies.sectionNotes")}
            </h3>
            <Textarea rows={3} error={errors.notes?.message} {...register("notes")} />
          </div>
        </fieldset>
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {readOnly ? t("shippingCompanies.close") : t("shippingCompanies.cancel")}
        </Button>
        {!readOnly && (
          <Button type="submit" form="shipping-company-form" isLoading={isSubmitting || mutation.isPending}>
            {t("shippingCompanies.save")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
