import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Button, Input } from "../../components/ui";
import { authApi } from "../../api/authApi";
import { useAuth } from "../../store/AuthContext";
import type { ApiError } from "../../types/auth";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
      .regex(/[0-9]/, "Debe incluir al menos un dígito")
      .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un carácter especial"),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof passwordSchema>;

const CHECKS: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: "length", label: "Al menos 8 caracteres", test: (v) => v.length >= 8 },
  { key: "upper", label: "Al menos una mayúscula", test: (v) => /[A-Z]/.test(v) },
  { key: "digit", label: "Al menos un dígito", test: (v) => /[0-9]/.test(v) },
  { key: "special", label: "Al menos un carácter especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordPage() {
  const { markPasswordChanged, logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const newPassword = watch("newPassword") ?? "";

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setServerError(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Contraseña actualizada correctamente");
      markPasswordChanged();
      navigate("/", { replace: true });
    } catch (err) {
      if (isAxiosError<ApiError>(err) && err.response) {
        setServerError(err.response.data.message || "No se pudo cambiar la contraseña");
      } else {
        setServerError("No se pudo conectar con el servidor.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-modal">
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-primary">Cambiar contraseña</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Debes establecer una nueva contraseña para continuar
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            id="currentPassword"
            type="password"
            label="Contraseña actual"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <Input
            id="newPassword"
            type="password"
            label="Nueva contraseña"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <ul className="flex flex-col gap-1 rounded-md bg-sage/30 p-3 text-xs">
            {CHECKS.map((check) => {
              const passed = check.test(newPassword);
              return (
                <li key={check.key} className={`flex items-center gap-2 ${passed ? "text-primary" : "text-gray-500"}`}>
                  {passed ? <Check size={14} /> : <X size={14} />}
                  {check.label}
                </li>
              );
            })}
          </ul>

          <Input
            id="confirmPassword"
            type="password"
            label="Confirmar nueva contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {serverError && (
            <div className="rounded-md bg-[#FADBD8] px-3 py-2 text-sm text-[#C0392B]">{serverError}</div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            Guardar nueva contraseña
          </Button>
          <button
            type="button"
            onClick={() => logout()}
            className="text-center text-xs text-gray-500 hover:underline"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
