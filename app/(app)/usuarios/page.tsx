"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Pencil, Plus, ShieldCheck } from "lucide-react";
import { listProfiles } from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate, roleLabels } from "@/lib/format";
import type { Profile, Role } from "@/lib/types";
import {
  Alert,
  EmptyState,
  LoadingScreen,
  Modal,
  PageHeader,
} from "@/components/ui";

type ModalMode = "create" | "edit" | "password" | null;

interface UserForm {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
}

const emptyForm: UserForm = {
  fullName: "",
  email: "",
  password: "",
  role: "vendedor",
  active: true,
};

export default function UsersPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      setUsers(await listProfiles());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin]);

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await getSupabase().functions.invoke("admin-users", {
      body,
    });

    if (invokeError) {
      let message =
        invokeError.message ||
        "No se pudo contactar la función admin-users. ¿Ya la desplegaste?";

      const context = (invokeError as { context?: Response }).context;
      if (context) {
        try {
          const payload = (await context.json()) as { error?: string };
          if (payload?.error) message = payload.error;
        } catch {
          // El cuerpo no era JSON; conservamos el mensaje original.
        }
      }

      throw new Error(message);
    }

    const result = data as { error?: string } | null;
    if (result?.error) throw new Error(result.error);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setMode("create");
  };

  const openEdit = (user: Profile) => {
    setEditing(user);
    setForm({
      fullName: user.full_name,
      email: user.email ?? "",
      password: "",
      role: user.role,
      active: user.active,
    });
    setFormError(null);
    setMode("edit");
  };

  const openPassword = (user: Profile) => {
    setEditing(user);
    setForm({ ...emptyForm, password: "" });
    setFormError(null);
    setMode("password");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (mode === "create") {
        if (!form.fullName.trim() || !form.email.trim()) {
          throw new Error("Nombre y correo son obligatorios.");
        }
        if (form.password.length < 8) {
          throw new Error("La contraseña debe tener al menos 8 caracteres.");
        }
        await invoke({
          action: "create",
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
        });
      } else if (mode === "edit" && editing) {
        await invoke({
          action: "update",
          id: editing.id,
          fullName: form.fullName.trim(),
          role: form.role,
          active: form.active,
        });
      } else if (mode === "password" && editing) {
        if (form.password.length < 8) {
          throw new Error("La contraseña debe tener al menos 8 caracteres.");
        }
        await invoke({
          action: "reset-password",
          id: editing.id,
          password: form.password,
        });
      }

      setMode(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card p-8 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Acceso restringido</h1>
        <p className="mt-1 text-sm text-slate-500">
          Solo los administradores pueden gestionar usuarios.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingScreen label="Cargando usuarios…" />;

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Crea cuentas, asigna roles y controla el acceso."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo usuario
          </button>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        {users.length === 0 ? (
          <EmptyState
            title="Sin usuarios"
            description="Crea el primer usuario para empezar."
            icon={<ShieldCheck className="h-10 w-10" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Alta</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-semibold text-slate-900">
                      {user.full_name || "Sin nombre"}
                      {user.id === profile?.id ? (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                          Tú
                        </span>
                      ) : null}
                    </td>
                    <td>{user.email || "—"}</td>
                    <td>{roleLabels[user.role]}</td>
                    <td>
                      <span
                        className={
                          user.active
                            ? "badge bg-emerald-100 text-emerald-800"
                            : "badge bg-slate-200 text-slate-600"
                        }
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="btn-ghost h-8 w-8 p-0"
                          onClick={() => openEdit(user)}
                          aria-label={`Editar ${user.full_name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost h-8 w-8 p-0"
                          onClick={() => openPassword(user)}
                          aria-label={`Cambiar contraseña de ${user.full_name}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={
          mode === "create"
            ? "Nuevo usuario"
            : mode === "edit"
              ? "Editar usuario"
              : "Cambiar contraseña"
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setMode(null)}>
              Cancelar
            </button>
            <button type="submit" form="user-form" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </button>
          </>
        }
      >
        <form id="user-form" className="space-y-4" onSubmit={onSubmit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          {mode === "create" ? (
            <>
              <div>
                <label className="label" htmlFor="user-name">
                  Nombre completo *
                </label>
                <input
                  id="user-name"
                  className="input"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="user-email">
                  Correo *
                </label>
                <input
                  id="user-email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="user-password">
                  Contraseña temporal *
                </label>
                <input
                  id="user-password"
                  type="text"
                  className="input"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Compártela con el usuario; puede cambiarla después.
                </p>
              </div>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <div>
                <label className="label" htmlFor="edit-name">
                  Nombre completo
                </label>
                <input
                  id="edit-name"
                  className="input"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-role">
                  Rol
                </label>
                <select
                  id="edit-role"
                  className="input"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                >
                  <option value="admin">Administrador</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="consulta">Consulta</option>
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-line bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                />
                Cuenta activa
              </label>
            </>
          ) : null}

          {mode === "password" ? (
            <div>
              <label className="label" htmlFor="new-password">
                Contraseña nueva para {editing?.full_name}
              </label>
              <input
                id="new-password"
                type="text"
                className="input"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
