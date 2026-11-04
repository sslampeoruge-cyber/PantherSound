"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Music2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { Alert, LoadingScreen } from "@/components/ui";

export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setDone(true);
        await getSupabase().auth.signOut();
        setTimeout(() => router.replace("/login/"), 2200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen label="Validando enlace…" />;

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

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-slate-500">Elige una contraseña de al menos 8 caracteres.</p>

      {done ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success">
            Contraseña actualizada. Te redirigiremos al inicio de sesión…
          </Alert>
          <Link href="/login/" className="btn-secondary w-full">
            <ArrowLeft className="h-4 w-4" /> Ir al inicio de sesión
          </Link>
        </div>
      ) : !session ? (
        <div className="mt-6 space-y-4">
          <Alert tone="error">
            El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de
            recuperación.
          </Alert>
          <Link href="/recuperar/" className="btn-secondary w-full">
            <ArrowLeft className="h-4 w-4" /> Solicitar otro enlace
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mt-5">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="label" htmlFor="password">
                Contraseña nueva
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  className="input px-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirm">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type={show ? "text" : "password"}
                className="input"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar contraseña
            </button>
          </form>
        </>
      )}
    </div>
  );
}
