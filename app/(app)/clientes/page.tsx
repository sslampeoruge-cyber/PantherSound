"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { listClients } from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Client } from "@/lib/types";
import {
  Alert,
  EmptyState,
  LoadingScreen,
  Modal,
  PageHeader,
} from "@/components/ui";

interface ClientFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const emptyForm: ClientFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function ClientsPage() {
  const { profile, user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = profile?.role === "admin" || profile?.role === "vendedor";
  const canDelete = profile?.role === "admin";

  const load = async () => {
    try {
      setClients(await listClients());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [client.name, client.phone, client.email, client.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [clients, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        const { error: updateError } = await getSupabase()
          .from("clients")
          .update(payload)
          .eq("id", editing.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await getSupabase().from("clients").insert({
          ...payload,
          created_by: user?.id ?? null,
        });
        if (insertError) throw new Error(insertError.message);
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (client: Client) => {
    if (!window.confirm(`¿Eliminar a ${client.name}? Los contratos existentes se conservarán.`)) {
      return;
    }
    const { error: deleteError } = await getSupabase()
      .from("clients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", client.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  };

  if (loading) return <LoadingScreen label="Cargando clientes…" />;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Directorio de personas que rentan el servicio."
        actions={
          canEdit ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo cliente
            </button>
          ) : null
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="border-b border-line p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, teléfono o correo…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description={search ? "No hay coincidencias con tu búsqueda." : "Agrega tu primer cliente para empezar a crear contratos."}
            icon={<Users className="h-10 w-10" />}
            action={
              canEdit && !search ? (
                <button type="button" className="btn-primary" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Nuevo cliente
                </button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Dirección</th>
                  {canEdit ? <th className="text-right">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id}>
                    <td className="font-semibold text-slate-900">{client.name}</td>
                    <td>{client.phone || "—"}</td>
                    <td>{client.email || "—"}</td>
                    <td className="max-w-xs truncate">{client.address || "—"}</td>
                    {canEdit ? (
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="btn-ghost h-8 w-8 p-0"
                            onClick={() => openEdit(client)}
                            aria-label={`Editar ${client.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              className="btn-ghost h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => void onDelete(client)}
                              aria-label={`Eliminar ${client.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="client-form" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </>
        }
      >
        <form id="client-form" className="space-y-4" onSubmit={onSubmit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <div>
            <label className="label" htmlFor="client-name">
              Nombre completo *
            </label>
            <input
              id="client-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="client-phone">
                Teléfono
              </label>
              <input
                id="client-phone"
                className="input"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="client-email">
                Correo
              </label>
              <input
                id="client-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="client-address">
              Dirección
            </label>
            <input
              id="client-address"
              className="input"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>

          <div>
            <label className="label" htmlFor="client-notes">
              Notas
            </label>
            <textarea
              id="client-notes"
              className="input min-h-24"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
