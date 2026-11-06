"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  Mail,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Alert } from "@/components/ui";

const schema = z.object({
  email: z.string().min(1, "Escribe tu correo").email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn, session, loading, configured } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard/");
  }, [loading, session, router]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const { error } = await signIn(values.email.trim(), values.password);
    if (error) {
      setServerError(error);
      return;
    }
    router.replace("/dashboard/");
  };

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-violet-900/10 md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-violet-700 via-violet-800 to-slate-950 p-8 text-white md:flex">
        <Image
          src="/logo.png"
          alt="PantherSound Luz y Sonido"
          width={192}
          height={68}
          className="h-auto w-48 rounded-xl"
          priority
        />

        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Contratos, anticipos y agenda en un solo lugar.
          </h2>
          <p className="mt-3 text-sm text-violet-100">
            Controla cada evento, registra los pagos y consulta el calendario con el estado de
            cada contratación.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-violet-100">
            <li className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4" /> Agenda con colores por estado de pago
            </li>
            <li className="flex items-center gap-3">
              <Wallet className="h-4 w-4" /> Anticipos e historial de abonos
            </li>
            <li className="flex items-center gap-3">
              <FileText className="h-4 w-4" /> Contratos listos para imprimir en PDF
            </li>
          </ul>
        </div>

        <p className="text-xs text-violet-300">
          San José secc. 11 · San Juan Xiutetelco, Pue.
        </p>
      </div>

      <div className="p-8 sm:p-10">
        <div className="mb-8 md:hidden">
          <Image
            src="/logo.png"
            alt="PantherSound Luz y Sonido"
            width={150}
            height={53}
            className="h-auto w-36 rounded-lg"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-500">Accede con la cuenta que te asignó el administrador.</p>

        {!configured ? (
          <div className="mt-5">
            <Alert tone="warning">
              <span className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Faltan las variables de entorno de Supabase. Configúralas para poder iniciar
                sesión.
              </span>
            </Alert>
          </div>
        ) : null}

        {serverError ? (
          <div className="mt-5">
            <Alert tone="error">{serverError}</Alert>
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="label" htmlFor="email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input pl-9"
                placeholder="correo@ejemplo.com"
                {...register("email")}
              />
            </div>
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="input px-9"
                placeholder="••••••••"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : null}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting || !configured}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          ¿Olvidaste tu contraseña?{" "}
          <Link href="/recuperar/" className="font-semibold text-brand hover:underline">
            Recupérala aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
