import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Button, Input } from "../../components/ui";
import { authApi } from "../../api/authApi";
import { useAuth } from "../../store/AuthContext";
import type { ApiError } from "../../types/auth";

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const { markPasswordChanged, logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t("changePassword.currentRequired")),
          newPassword: z
            .string()
            .min(8, t("changePassword.minLength"))
            .regex(/[A-Z]/, t("changePassword.needUpper"))
            .regex(/[0-9]/, t("changePassword.needDigit"))
            .regex(/[^A-Za-z0-9]/, t("changePassword.needSpecial")),
          confirmPassword: z.string().min(1, t("changePassword.confirmRequired")),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t("changePassword.passwordsMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );
  type ChangePasswordFormValues = z.infer<typeof passwordSchema>;

  const CHECKS: { key: string; label: string; test: (v: string) => boolean }[] = [
    { key: "length", label: t("changePassword.checkLength"), test: (v) => v.length >= 8 },
    { key: "upper", label: t("changePassword.checkUpper"), test: (v) => /[A-Z]/.test(v) },
    { key: "digit", label: t("changePassword.checkDigit"), test: (v) => /[0-9]/.test(v) },
    { key: "special", label: t("changePassword.checkSpecial"), test: (v) => /[^A-Za-z0-9]/.test(v) },
  ];

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
      toast.success(t("changePassword.success"));
      markPasswordChanged();
      navigate("/", { replace: true });
    } catch (err) {
      if (isAxiosError<ApiError>(err) && err.response) {
        setServerError(err.response.data.message || t("changePassword.error"));
      } else {
        setServerError(t("changePassword.connectionError"));
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-surface px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-sage/40 bg-white p-8 shadow-elevated">
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-primary">
          Container<span className="text-accent-dark">Track</span>
        </h1>
        <p className="mb-1 text-center text-base font-semibold text-dark-brown">{t("changePassword.title")}</p>
        <p className="mb-6 text-center text-sm text-gray-500">{t("changePassword.subtitle")}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            id="currentPassword"
            type="password"
            label={t("changePassword.currentPassword")}
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <Input
            id="newPassword"
            type="password"
            label={t("changePassword.newPassword")}
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <ul className="flex flex-col gap-1.5 rounded-md border border-sage/50 bg-sage/20 p-3 text-xs">
            {CHECKS.map((check) => {
              const passed = check.test(newPassword);
              return (
                <li
                  key={check.key}
                  className={`flex items-center gap-2 transition-colors duration-200 ${
                    passed ? "text-primary" : "text-gray-500"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                      passed ? "bg-primary text-ivory" : "bg-gray-300 text-white"
                    }`}
                  >
                    {passed ? <Check size={11} /> : <X size={11} />}
                  </span>
                  {check.label}
                </li>
              );
            })}
          </ul>

          <Input
            id="confirmPassword"
            type="password"
            label={t("changePassword.confirmPassword")}
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {serverError && (
            <div className="rounded-md border border-[#C0392B]/20 bg-[#FADBD8] px-3 py-2 text-sm text-[#C0392B]">
              {serverError}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            {t("changePassword.submit")}
          </Button>
          <button
            type="button"
            onClick={() => logout()}
            className="text-center text-xs text-gray-500 transition-colors duration-150 hover:text-primary hover:underline"
          >
            {t("changePassword.logout")}
          </button>
        </form>
      </div>
    </div>
  );
}
