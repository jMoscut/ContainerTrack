import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../store/AuthContext";
import type { ApiError } from "../../types/auth";

const loginSchema = z.object({
  email: z.string().min(1, "El correo es requerido").email("Correo inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const remainingSeconds = useCountdown(lockedUntil);

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
          setServerError(message || "Correo o contraseña incorrectos");
        }
      } else {
        setServerError("No se pudo conectar con el servidor.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-modal">
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-primary">ContainerTrack</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Ingresa a tu cuenta</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Correo electrónico"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && (
            <div className="rounded-md bg-[#FADBD8] px-3 py-2 text-sm text-[#C0392B]">
              {serverError}
              {remainingSeconds !== null && remainingSeconds > 0 && (
                <div className="mt-1 font-semibold">
                  Intenta de nuevo en {Math.floor(remainingSeconds / 60)}:
                  {String(remainingSeconds % 60).padStart(2, "0")}
                </div>
              )}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
