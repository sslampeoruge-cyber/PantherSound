"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import {
  listClients,
  listFrameTypes,
  listSoundPackages,
  listVenues,
} from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import type {
  Client,
  ContractRow,
  FrameType,
  SoundPackage,
  Venue,
} from "@/lib/types";
import { Alert } from "./ui";

const schema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  venue_id: z.string().optional(),
  event_date: z.string().min(1, "Selecciona la fecha del evento"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  event_type: z.string().optional(),
  honoree_name: z.string().optional(),
  sound_package_id: z.string().optional(),
  sound_notes: z.string().optional(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  photos: z.boolean(),
  frame_type_id: z.string().optional(),
  filming: z.boolean(),
  recording_location: z.string().optional(),
  observations: z.string().optional(),
  representative_name: z.string().optional(),
  signed_at: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function nullify(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ContractForm({
  contract,
  onSaved,
  onCancel,
}: {
  contract?: ContractRow;
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sounds, setSounds] = useState<SoundPackage[]>([]);
  const [frames, setFrames] = useState<FrameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: contract?.client_id ?? "",
      venue_id: contract?.venue_id ?? "",
      event_date: contract?.event_date ?? todayISO(),
      start_time: contract?.start_time?.slice(0, 5) ?? "",
      end_time: contract?.end_time?.slice(0, 5) ?? "",
      event_type: contract?.event_type ?? "",
      honoree_name: contract?.honoree_name ?? "",
      sound_package_id: contract?.sound_package_id ?? "",
      sound_notes: contract?.sound_notes ?? "",
      price: contract?.price ?? 0,
      photos: contract?.photos ?? false,
      frame_type_id: contract?.frame_type_id ?? "",
      filming: contract?.filming ?? false,
      recording_location: contract?.recording_location ?? "",
      observations: contract?.observations ?? "",
      representative_name: contract?.representative_name ?? "",
      signed_at: contract?.signed_at ?? todayISO(),
    },
  });

  useEffect(() => {
    let active = true;

    Promise.all([listClients(), listVenues(), listSoundPackages(), listFrameTypes()])
      .then(([clientsData, venuesData, soundsData, framesData]) => {
        if (!active) return;
        setClients(clientsData);
        setVenues(venuesData);
        setSounds(soundsData);
        setFrames(framesData);
      })
      .catch((err) => {
        if (active) {
          setServerError(err instanceof Error ? err.message : "No se pudieron cargar los catálogos.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedSoundId = watch("sound_package_id");

  useEffect(() => {
    if (!selectedSoundId) return;
    const sound = sounds.find((item) => item.id === selectedSoundId);
    if (sound && sound.base_price > 0 && (!watch("price") || Number(watch("price")) === 0)) {
      setValue("price", sound.base_price);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSoundId, sounds]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const payload = {
        client_id: values.client_id,
        venue_id: nullify(values.venue_id),
        event_date: values.event_date,
        start_time: nullify(values.start_time),
        end_time: nullify(values.end_time),
        event_type: nullify(values.event_type),
        honoree_name: nullify(values.honoree_name),
        sound_package_id: nullify(values.sound_package_id),
        sound_notes: nullify(values.sound_notes),
        price: Number(values.price) || 0,
        photos: values.photos,
        frame_type_id: nullify(values.frame_type_id),
        filming: values.filming,
        recording_location: nullify(values.recording_location),
        observations: nullify(values.observations),
        representative_name: nullify(values.representative_name),
        signed_at: nullify(values.signed_at),
      };

      if (contract) {
        const { error } = await getSupabase()
          .from("contracts")
          .update(payload)
          .eq("id", contract.id);
        if (error) throw new Error(error.message);
        onSaved(contract.id);
      } else {
        const { data, error } = await getSupabase()
          .from("contracts")
          .insert({ ...payload, created_by: user?.id ?? null })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        onSaved((data as { id: string }).id);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "No se pudo guardar el contrato.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogos…
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}

      {clients.length === 0 ? (
        <Alert tone="warning">
          No hay clientes registrados. Primero agrega un cliente en la sección{" "}
          <a href="/clientes/" className="font-semibold underline">
            Clientes
          </a>
          .
        </Alert>
      ) : null}

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Cliente y evento
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="client_id">
              Cliente *
            </label>
            <select id="client_id" className="input" {...register("client_id")}>
              <option value="">Selecciona un cliente…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.phone ? ` · ${client.phone}` : ""}
                </option>
              ))}
            </select>
            {errors.client_id ? (
              <p className="mt-1 text-xs text-red-600">{errors.client_id.message}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="event_date">
              Fecha del evento *
            </label>
            <input id="event_date" type="date" className="input" {...register("event_date")} />
            {errors.event_date ? (
              <p className="mt-1 text-xs text-red-600">{errors.event_date.message}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="venue_id">
              Salón
            </label>
            <select id="venue_id" className="input" {...register("venue_id")}>
              <option value="">Sin salón</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="start_time">
              Inicia
            </label>
            <input id="start_time" type="time" className="input" {...register("start_time")} />
          </div>

          <div>
            <label className="label" htmlFor="end_time">
              Termina
            </label>
            <input id="end_time" type="time" className="input" {...register("end_time")} />
          </div>

          <div>
            <label className="label" htmlFor="event_type">
              Tipo de evento
            </label>
            <input
              id="event_type"
              className="input"
              placeholder="Cumpleaños, boda, XV años…"
              {...register("event_type")}
            />
          </div>

          <div>
            <label className="label" htmlFor="honoree_name">
              Nombre del festejado
            </label>
            <input id="honoree_name" className="input" {...register("honoree_name")} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Sonido, fotos y video
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sound_package_id">
              Tamaño / paquete de sonido
            </label>
            <select id="sound_package_id" className="input" {...register("sound_package_id")}>
              <option value="">Sin especificar</option>
              {sounds.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="price">
              Precio del servicio
            </label>
            <input
              id="price"
              type="number"
              min={0}
              step="0.01"
              className="input"
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price ? (
              <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="sound_notes">
              Detalle del sonido
            </label>
            <input id="sound_notes" className="input" {...register("sound_notes")} />
          </div>

          <div>
            <label className="label" htmlFor="frame_type_id">
              Tipo de cuadro
            </label>
            <select id="frame_type_id" className="input" {...register("frame_type_id")}>
              <option value="">Sin cuadro</option>
              {frames.map((frame) => (
                <option key={frame.id} value={frame.id}>
                  {frame.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="recording_location">
              Grabar en
            </label>
            <input
              id="recording_location"
              className="input"
              placeholder="Lugar o formato de entrega"
              {...register("recording_location")}
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-line bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              {...register("photos")}
            />
            Incluye fotos
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-line bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              {...register("filming")}
            />
            Incluye filmación
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Notas y firma
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="representative_name">
              Representante
            </label>
            <input
              id="representative_name"
              className="input"
              placeholder="Nombre de quien firma por PantherSound"
              {...register("representative_name")}
            />
          </div>

          <div>
            <label className="label" htmlFor="signed_at">
              Fecha de firma
            </label>
            <input id="signed_at" type="date" className="input" {...register("signed_at")} />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="observations">
              Observaciones
            </label>
            <textarea
              id="observations"
              className="input min-h-24"
              {...register("observations")}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={isSubmitting || clients.length === 0}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {contract ? "Guardar cambios" : "Crear contrato"}
        </button>
      </div>
    </form>
  );
}
