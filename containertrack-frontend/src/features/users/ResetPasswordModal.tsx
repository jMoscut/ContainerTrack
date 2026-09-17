import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Check, X, KeyRound } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button, Input } from "../../components/ui";
import { usersApi } from "../../api/usersApi";
import type { User } from "../../types/user";
import type { ApiError } from "../../types/auth";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

/** Admin-initiated password reset: the admin types the temporary password that
 *  will be handed to the user. The user is forced to change it on next login
 *  (must_change_password=true) — this is one of only two flows that force a
 *  password change, the other being new-user creation. */
export function ResetPasswordModal({ isOpen, onClose, user }: ResetPasswordModalProps) {
  const { t } = useTranslation();

  const schema = useMemo(
    () =>
      z.object({
        temporaryPassword: z
          .string()
          .min(8, t("resetPassword.minLength"))
          .regex(/[A-Z]/, t("resetPassword.needUpper"))
          .regex(/[0-9]/, t("resetPassword.needDigit"))
          .regex(/[^A-Za-z0-9]/, t("resetPassword.needSpecial")),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const CHECKS: { key: string; label: string; test: (v: string) => boolean }[] = [
    { key: "length", label: t("resetPassword.checkLength"), test: (v) => v.length >= 8 },
    { key: "upper", label: t("resetPassword.checkUpper"), test: (v) => /[A-Z]/.test(v) },
    { key: "digit", label: t("resetPassword.checkDigit"), test: (v) => /[0-9]/.test(v) },
    { key: "special", label: t("resetPassword.checkSpecial"), test: (v) => /[^A-Za-z0-9]/.test(v) },
  ];

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch("temporaryPassword") ?? "";

  const mutation = useMutation({
    mutationFn: (values: FormValues) => usersApi.resetPassword(user!.id, values),
    onSuccess: () => {
      toast.success(t("resetPassword.success"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      onClose();
    },
    onError: (err) => {
      if (isAxiosError<ApiError>(err) && err.response) {
        toast.error(err.response.data.message || t("resetPassword.error"));
      } else {
        toast.error(t("resetPassword.error"));
      }
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${t("resetPassword.title")}${user ? ` — ${user.fullName}` : ""}`}
      size="sm"
    >
      <form
        id="reset-password-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <p className="flex items-start gap-2 rounded-md border border-sage/50 bg-sage/20 p-3 text-xs text-dark-brown">
          <KeyRound size={16} className="mt-0.5 flex-shrink-0 text-primary" />
          {t("resetPassword.hint")}
        </p>

        <Input
          id="temporaryPassword"
          type="text"
          label={t("resetPassword.label")}
          autoComplete="off"
          error={errors.temporaryPassword?.message}
          {...register("temporaryPassword")}
        />

        <ul className="flex flex-col gap-1.5 rounded-md border border-sage/50 bg-sage/20 p-3 text-xs">
          {CHECKS.map((check) => {
            const passed = check.test(password);
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
      </form>
      <div className="mt-4 flex justify-end gap-2 border-t border-sage pt-4">
        <Button type="button" variant="ghost" onClick={handleClose}>
          {t("resetPassword.cancel")}
        </Button>
        <Button type="submit" form="reset-password-form" isLoading={isSubmitting || mutation.isPending}>
          {t("resetPassword.submit")}
        </Button>
      </div>
    </Modal>
  );
}
