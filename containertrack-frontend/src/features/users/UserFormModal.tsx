import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, Select } from "../../components/ui";
import { usersApi } from "../../api/usersApi";
import type { User } from "../../types/user";
import type { Role, ApiError } from "../../types/auth";

const schema = z.object({
  fullName: z.string().min(1, "Requerido"),
  email: z.string().email("Correo inválido"),
  role: z.enum(["ADMIN", "OPERATOR", "WAREHOUSE"]),
});

type FormValues = z.infer<typeof schema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserFormModal({ isOpen, onClose, user }: UserFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isOpen) {
      reset(user ? { fullName: user.fullName, email: user.email, role: user.role } : { role: "OPERATOR" as Role });
    }
  }, [isOpen, user, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? usersApi.update(user!.id, { fullName: values.fullName, role: values.role })
        : usersApi.create(values),
    onSuccess: () => {
      toast.success(isEdit ? "Usuario actualizado" : "Usuario creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || "No se pudo guardar el usuario");
      } else {
        toast.error("No se pudo guardar el usuario");
      }
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Editar usuario" : "Nuevo usuario"} size="sm">
      <form id="user-form" onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
        <Input label="Nombre completo" error={errors.fullName?.message} {...register("fullName")} />
        <Input
          label="Correo electrónico"
          type="email"
          disabled={isEdit}
          error={errors.email?.message}
          {...register("email")}
        />
        <Select label="Rol" error={errors.role?.message} {...register("role")}>
          <option value="ADMIN">Administrador</option>
          <option value="OPERATOR">Operador</option>
          <option value="WAREHOUSE">Bodega</option>
        </Select>
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="user-form" isLoading={isSubmitting || mutation.isPending}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
