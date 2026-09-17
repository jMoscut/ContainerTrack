import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { Ship, ShieldCheck, MapPin } from "lucide-react";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../store/AuthContext";
import type { ApiError } from "../../types/auth";

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setRemaining(null);
      return;
    }
    const targetTime = new Date(target).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((targetTime - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return remaining;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const remainingSeconds = useCountdown(lockedUntil);

  // Re-derived on language change so validation messages follow the active locale.
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t("login.emailRequired")).email(t("login.emailInvalid")),
        password: z.string().min(1, t("login.passwordRequired")),
      }),
    [t],
  );
  type LoginFormValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setLockedUntil(null);
    try {
      const user = await login(values);
      navigate(user.mustChangePassword ? "/change-password" : "/", { replace: true });
    } catch (err) {
      if (isAxiosError<ApiError>(err) && err.response) {
        const { error, message, lockedUntil: locked } = err.response.data;
        if (error === "ACCOUNT_LOCKED") {
          setServerError(message);
          setLockedUntil(locked ?? null);
        } else {
          setServerError(message || t("login.error"));
        }
      } else {
        setServerError(t("login.connectionError"));
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-surface">
      {/* Branded decorative side — hidden below md, becomes the whole screen at md+ */}
      <div className="bg-noise relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-hero p-10 text-ivory md:flex lg:p-14">
        <div className="font-display text-2xl font-bold tracking-tight">
          Container<span className="text-accent">Track</span>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="font-display text-3xl font-bold leading-tight lg:text-4xl">{t("login.tagline")}</h2>
          <p className="max-w-md text-sm text-ivory/75">{t("login.description")}</p>
          <ul className="flex flex-col gap-3 text-sm text-ivory/85">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <Ship size={16} className="text-accent" />
              </span>
              {t("login.feature1")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <MapPin size={16} className="text-accent" />
              </span>
              {t("login.feature2")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <ShieldCheck size={16} className="text-accent" />
              </span>
              {t("login.feature3")}
            </li>
          </ul>
        </div>

        <p className="text-xs text-ivory/50">&copy; {new Date().getFullYear()} ContainerTrack</p>
      </div>

      {/* Form side */}
      <div className="flex w-full flex-1 items-center justify-center px-4 py-12 md:w-1/2">
        <div className="w-full max-w-sm rounded-lg border border-sage/40 bg-white p-8 shadow-elevated">
          <h1 className="mb-1 text-center font-display text-2xl font-bold text-primary md:hidden">
            Container<span className="text-accent-dark">Track</span>
          </h1>
          <h1 className="mb-1 hidden text-center font-display text-2xl font-bold text-primary md:block">
            {t("login.welcome")}
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              id="email"
              type="email"
              label={t("login.email")}
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="password"
              type="password"
              label={t("login.password")}
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            {serverError && (
              <div className="rounded-md border border-[#C0392B]/20 bg-[#FADBD8] px-3 py-2 text-sm text-[#C0392B]">
                {serverError}
                {remainingSeconds !== null && remainingSeconds > 0 && (
                  <div className="mt-1 font-semibold tabular-nums">
                    {t("login.retryIn")} {Math.floor(remainingSeconds / 60)}:
                    {String(remainingSeconds % 60).padStart(2, "0")}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              {t("login.submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
