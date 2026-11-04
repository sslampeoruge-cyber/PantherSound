"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AlertTriangle, LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LoadingScreen } from "./ui";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading, configured, error, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !session) {
      router.replace("/login/");
    }
  }, [loading, configured, session, router]);

  if (!configured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Falta configurar Supabase</h1>
        <p className="text-sm text-slate-500">
          Agrega <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en las
          variables de entorno y vuelve a desplegar.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingScreen label="Verificando sesión…" />;

  if (!session) return <LoadingScreen label="Redirigiendo…" />;

  if (!profile && !error) return <LoadingScreen label="Cargando perfil…" />;

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">No se encontró tu perfil</h1>
        <p className="text-sm text-slate-500">
          {error ?? "Pide a un administrador que revise tu cuenta."}
        </p>
        <button type="button" className="btn-secondary" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    );
  }

  if (!profile.active) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Cuenta pendiente de activación</h1>
        <p className="text-sm text-slate-500">
          Tu cuenta existe, pero un administrador todavía no la ha activado.
        </p>
        <button type="button" className="btn-secondary" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
