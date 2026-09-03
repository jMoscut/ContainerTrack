import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Textarea } from "../../components/ui";
import { shippingCompaniesApi } from "../../api/shippingCompaniesApi";
import type { ShippingCompany } from "../../types/shippingCompany";
import type { ApiError } from "../../types/auth";

const schema = z.object({
  name: z.string().min(1, "Requerido"),
  shortCode: z.string().min(1, "Requerido"),
  country: z.string().min(1, "Requerido"),
  contactEmail: z.string().email("Correo inválido").or(z.literal("")),
  contactPhone: z.string(),
  notes: z.string(),
  freeDaysLimit: z.number().int().min(0, "Debe ser mayor o igual a 0"),
});

type FormValues = z.infer<typeof schema>;

interface ShippingCompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: ShippingCompany | null;
}

export function ShippingCompanyFormModal({ isOpen, onClose, company }: ShippingCompanyFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!company;

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
      toast.success(isEdit ? "Naviera actualizada" : "Naviera creada correctamente");
      queryClient.invalidateQueries({ queryKey: ["shippingCompanies"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo guardar la naviera");
      } else {
        toast.error("No se pudo guardar la naviera");
      }
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Editar naviera" : "Nueva naviera"} size="md">
      <form
        id="shipping-company-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Input label="Nombre" error={errors.name?.message} {...register("name")} />
        <Input label="Código corto" error={errors.shortCode?.message} {...register("shortCode")} />
        <Input label="País" error={errors.country?.message} {...register("country")} />
        <Input
          label="Días libres"
          type="number"
          min={0}
          error={errors.freeDaysLimit?.message}
          {...register("freeDaysLimit", { valueAsNumber: true })}
        />
        <Input
          label="Correo de contacto"
          type="email"
          error={errors.contactEmail?.message}
          {...register("contactEmail")}
        />
        <Input label="Teléfono de contacto" error={errors.contactPhone?.message} {...register("contactPhone")} />
        <Textarea
          label="Notas"
          rows={3}
          className="sm:col-span-2"
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="shipping-company-form" isLoading={isSubmitting || mutation.isPending}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
