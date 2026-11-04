"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail, Music2 } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Alert } from "@/components/ui";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/restablecer/` },
      );
      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-2xl shadow-violet-900/10 sm:p-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Music2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-bold text-slate-900">PantherSound</p>
          <p className="text-[11px] uppercase tracking-widest text-slate-400">Luz y Sonido</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-slate-500">
        Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
      </p>

      {sent ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success">
            Si el correo existe, recibirás un enlace para restablecer tu contraseña. Revisa tu
            bandeja de entrada y la carpeta de spam.
          </Alert>
          <Link href="/login/" className="btn-secondary w-full">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <>
          {!isSupabaseConfigured ? (
            <div className="mt-5">
              <Alert tone="warning">Faltan las variables de entorno de Supabase.</Alert>
            </div>
          ) : null}
          {error ? (
            <div className="mt-5">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="label" htmlFor="email">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  className="input pl-9"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !isSupabaseConfigured}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enviar enlace
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
