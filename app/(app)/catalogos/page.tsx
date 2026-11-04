"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power } from "lucide-react";
import {
  listClauses,
  listFrameTypes,
  listSoundPackages,
  listVenues,
} from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Clause, FrameType, SoundPackage, Venue } from "@/lib/types";
import { Alert, LoadingScreen, Modal, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

type Tab = "venues" | "sounds" | "frames" | "clauses";

const tabs: { id: Tab; label: string }[] = [
  { id: "venues", label: "Salones" },
  { id: "sounds", label: "Paquetes de sonido" },
  { id: "frames", label: "Tipos de cuadro" },
  { id: "clauses", label: "Cláusulas" },
];

interface CatalogForm {
  name: string;
  description: string;
  address: string;
  price: string;
  position: string;
  text: string;
}

const emptyForm: CatalogForm = {
  name: "",
  description: "",
  address: "",
  price: "0",
  position: "1",
  text: "",
};

export default function CatalogsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [tab, setTab] = useState<Tab>("venues");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sounds, setSounds] = useState<SoundPackage[]>([]);
  const [frames, setFrames] = useState<FrameType[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [venuesData, soundsData, framesData, clausesData] = await Promise.all([
        listVenues(!isAdmin),
        listSoundPackages(!isAdmin),
        listFrameTypes(!isAdmin),
        listClauses(!isAdmin),
      ]);
      setVenues(venuesData);
      setSounds(soundsData);
      setFrames(framesData);
      setClauses(clausesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los catálogos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setFormError(null);
    if (tab === "venues") {
      const item = venues.find((venue) => venue.id === id);
      if (item) setForm({ ...emptyForm, name: item.name, address: item.address ?? "" });
    } else if (tab === "sounds") {
      const item = sounds.find((sound) => sound.id === id);
      if (item) {
        setForm({
          ...emptyForm,
          name: item.name,
          description: item.description ?? "",
          price: String(item.base_price),
        });
      }
    } else if (tab === "frames") {
      const item = frames.find((frame) => frame.id === id);
      if (item) setForm({ ...emptyForm, name: item.name, price: String(item.price) });
    } else {
      const item = clauses.find((clause) => clause.id === id);
      if (item) {
        setForm({
          ...emptyForm,
          position: String(item.position),
          text: item.text,
        });
      }
    }
    setModalOpen(true);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (tab === "clauses" && !form.text.trim()) {
      setFormError("El texto de la cláusula es obligatorio.");
      return;
    }
    if (tab !== "clauses" && !form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();

      if (tab === "venues") {
        const payload = { name: form.name.trim(), address: form.address.trim() || null };
        const result = editingId
          ? await supabase.from("venues").update(payload).eq("id", editingId)
          : await supabase.from("venues").insert(payload);
        if (result.error) throw new Error(result.error.message);
      } else if (tab === "sounds") {
        const payload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          base_price: Number(form.price) || 0,
        };
        const result = editingId
          ? await supabase.from("sound_packages").update(payload).eq("id", editingId)
          : await supabase.from("sound_packages").insert(payload);
        if (result.error) throw new Error(result.error.message);
      } else if (tab === "frames") {
        const payload = { name: form.name.trim(), price: Number(form.price) || 0 };
        const result = editingId
          ? await supabase.from("frame_types").update(payload).eq("id", editingId)
          : await supabase.from("frame_types").insert(payload);
        if (result.error) throw new Error(result.error.message);
      } else {
        const payload = { position: Number(form.position) || 1, text: form.text.trim() };
        const result = editingId
          ? await supabase.from("clauses").update(payload).eq("id", editingId)
          : await supabase.from("clauses").insert(payload);
        if (result.error) throw new Error(result.error.message);
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (table: "venues" | "sound_packages" | "frame_types" | "clauses", id: string, active: boolean) => {
    const { error: toggleError } = await getSupabase()
      .from(table)
      .update({ active: !active })
      .eq("id", id);
    if (toggleError) {
      setError(toggleError.message);
      return;
    }
    await load();
  };

  if (loading) return <LoadingScreen label="Cargando catálogos…" />;

  return (
    <div>
      <PageHeader
        title="Catálogos"
        description={
          isAdmin
            ? "Administra las opciones que aparecen en los contratos."
            : "Opciones disponibles para los contratos."
        }
        actions={
          isAdmin ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Agregar
            </button>
          ) : null
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              tab === item.id
                ? "bg-brand text-white shadow-sm"
                : "border border-line bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab === "venues" ? (
          <table className="table-base">
            <thead>
              <tr>
                <th>Salón</th>
                <th>Dirección</th>
                <th>Estado</th>
                {isAdmin ? <th className="text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td className="font-semibold text-slate-900">{venue.name}</td>
                  <td>{venue.address || "—"}</td>
                  <td>{venue.active ? "Activo" : "Inactivo"}</td>
                  {isAdmin ? (
                    <td>
                      <RowActions
                        onEdit={() => openEdit(venue.id)}
                        onToggle={() => void toggleActive("venues", venue.id, venue.active)}
                        active={venue.active}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "sounds" ? (
          <table className="table-base">
            <thead>
              <tr>
                <th>Paquete</th>
                <th>Descripción</th>
                <th className="text-right">Precio base</th>
                <th>Estado</th>
                {isAdmin ? <th className="text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {sounds.map((sound) => (
                <tr key={sound.id}>
                  <td className="font-semibold text-slate-900">{sound.name}</td>
                  <td>{sound.description || "—"}</td>
                  <td className="text-right">{money(sound.base_price)}</td>
                  <td>{sound.active ? "Activo" : "Inactivo"}</td>
                  {isAdmin ? (
                    <td>
                      <RowActions
                        onEdit={() => openEdit(sound.id)}
                        onToggle={() => void toggleActive("sound_packages", sound.id, sound.active)}
                        active={sound.active}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "frames" ? (
          <table className="table-base">
            <thead>
              <tr>
                <th>Tipo de cuadro</th>
                <th className="text-right">Precio</th>
                <th>Estado</th>
                {isAdmin ? <th className="text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {frames.map((frame) => (
                <tr key={frame.id}>
                  <td className="font-semibold text-slate-900">{frame.name}</td>
                  <td className="text-right">{money(frame.price)}</td>
                  <td>{frame.active ? "Activo" : "Inactivo"}</td>
                  {isAdmin ? (
                    <td>
                      <RowActions
                        onEdit={() => openEdit(frame.id)}
                        onToggle={() => void toggleActive("frame_types", frame.id, frame.active)}
                        active={frame.active}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "clauses" ? (
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-16">#</th>
                <th>Texto</th>
                <th>Estado</th>
                {isAdmin ? <th className="text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {clauses.map((clause) => (
                <tr key={clause.id}>
                  <td className="font-semibold text-slate-900">{clause.position}</td>
                  <td className="max-w-2xl">{clause.text}</td>
                  <td>{clause.active ? "Activa" : "Inactiva"}</td>
                  {isAdmin ? (
                    <td>
                      <RowActions
                        onEdit={() => openEdit(clause.id)}
                        onToggle={() => void toggleActive("clauses", clause.id, clause.active)}
                        active={clause.active}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingId ? "Editar" : "Agregar"} ${tabs.find((item) => item.id === tab)?.label.toLowerCase()}`}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="catalog-form" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </>
        }
      >
        <form id="catalog-form" className="space-y-4" onSubmit={onSubmit}>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          {tab === "clauses" ? (
            <>
              <div>
                <label className="label" htmlFor="clause-position">
                  Orden
                </label>
                <input
                  id="clause-position"
                  type="number"
                  min={1}
                  className="input"
                  value={form.position}
                  onChange={(event) => setForm({ ...form, position: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="clause-text">
                  Texto *
                </label>
                <textarea
                  id="clause-text"
                  className="input min-h-32"
                  value={form.text}
                  onChange={(event) => setForm({ ...form, text: event.target.value })}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="catalog-name">
                Nombre *
              </label>
              <input
                id="catalog-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
          )}

          {tab === "venues" ? (
            <div>
              <label className="label" htmlFor="catalog-address">
                Dirección
              </label>
              <input
                id="catalog-address"
                className="input"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
          ) : null}

          {tab === "sounds" ? (
            <>
              <div>
                <label className="label" htmlFor="catalog-description">
                  Descripción
                </label>
                <input
                  id="catalog-description"
                  className="input"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="catalog-price">
                  Precio base
                </label>
                <input
                  id="catalog-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </div>
            </>
          ) : null}

          {tab === "frames" ? (
            <div>
              <label className="label" htmlFor="catalog-frame-price">
                Precio
              </label>
              <input
                id="catalog-frame-price"
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}

function RowActions({
  onEdit,
  onToggle,
  active,
}: {
  onEdit: () => void;
  onToggle: () => void;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={onEdit} aria-label="Editar">
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="btn-ghost h-8 w-8 p-0"
        onClick={onToggle}
        aria-label={active ? "Desactivar" : "Activar"}
        title={active ? "Desactivar" : "Activar"}
      >
        <Power className={cn("h-4 w-4", active ? "text-emerald-600" : "text-slate-400")} />
      </button>
    </div>
  );
}
