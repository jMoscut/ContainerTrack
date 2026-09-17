import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Truck, Warehouse } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { usersApi } from "../../api/usersApi";
import type { User } from "../../types/user";
import type { Role, ApiError } from "../../types/auth";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserFormModal({ isOpen, onClose, user }: UserFormModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(1, t("userForm.required")),
        email: z.string().email(t("userForm.invalidEmail")),
        role: z.enum(["ADMIN", "OPERATOR", "WAREHOUSE"]),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const ROLE_OPTIONS: { value: Role; label: string; description: string; icon: typeof ShieldCheck }[] = [
    { value: "ADMIN", label: t("roles.ADMIN"), description: t("userForm.roleAdminDesc"), icon: ShieldCheck },
    { value: "OPERATOR", label: t("roles.OPERATOR"), description: t("userForm.roleOperatorDesc"), icon: Truck },
    { value: "WAREHOUSE", label: t("roles.WAREHOUSE"), description: t("userForm.roleWarehouseDesc"), icon: Warehouse },
  ];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedRole = watch("role");

  useEffect(() => {
    if (isOpen) {
      reset(user ? { fullName: user.fullName, email: user.email, role: user.role } : { role: "OPERATOR" as Role });
    }
  }, [isOpen, user, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? usersApi.update(user!.id, { fullName: values.fullName, email: values.email, role: values.role })
        : usersApi.create(values),
    onSuccess: () => {
      toast.success(isEdit ? t("userForm.updateSuccess") : t("userForm.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("userForm.saveError"));
      } else {
        toast.error(t("userForm.saveError"));
      }
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("userForm.editTitle") : t("userForm.newTitle")}
      size="md"
    >
      <form
        id="user-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label={t("userForm.fullName")} error={errors.fullName?.message} {...register("fullName")} />
          <Input
            label={t("userForm.email")}
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-dark-brown">{t("userForm.role")}</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRole === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-md border p-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-subtle"
                      : "border-sage bg-white hover:border-primary/40"
                  }`}
                >
                  <input type="radio" value={option.value} className="sr-only" {...register("role")} />
                  <span
                    className={`flex items-center gap-1.5 text-sm font-semibold ${
                      isSelected ? "text-primary" : "text-dark-brown"
                    }`}
                  >
                    <Icon size={16} />
                    {option.label}
                  </span>
                  <span className="text-xs leading-snug text-gray-500">{option.description}</span>
                </label>
              );
            })}
          </div>
          {errors.role?.message && <span className="text-xs text-[#C0392B]">{errors.role.message}</span>}
        </div>
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("userForm.cancel")}
        </Button>
        <Button type="submit" form="user-form" isLoading={isSubmitting || mutation.isPending}>
          {t("userForm.save")}
        </Button>
      </div>
    </Modal>
  );
}
