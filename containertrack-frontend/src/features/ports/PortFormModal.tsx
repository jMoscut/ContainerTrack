import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { portsApi } from "../../api/portsApi";
import type { Port } from "../../types/port";
import type { ApiError } from "../../types/auth";

const schema = z.object({
  name: z.string().min(1, "Requerido"),
  country: z.string().min(1, "Requerido"),
  isGuatemalan: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface PortFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  port?: Port | null;
}

export function PortFormModal({ isOpen, onClose, port }: PortFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!port;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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
      toast.success(isEdit ? "Puerto actualizado" : "Puerto creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["ports"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo guardar el puerto");
      } else {
        toast.error("No se pudo guardar el puerto");
      }
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Editar puerto" : "Nuevo puerto"} size="sm">
      <form
        id="port-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <Input label="Nombre" error={errors.name?.message} {...register("name")} />
        <Input label="País" error={errors.country?.message} {...register("country")} />
        <label className="flex items-center gap-2 text-sm font-medium text-dark-brown">
          <input type="checkbox" className="h-4 w-4" {...register("isGuatemalan")} />
          Puerto guatemalteco
        </label>
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="port-form" isLoading={isSubmitting || mutation.isPending}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
