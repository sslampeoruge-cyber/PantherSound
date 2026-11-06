"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventInput } from "@fullcalendar/core";
import { CalendarDays } from "lucide-react";
import { listContracts } from "@/lib/api";
import { money, statusMeta } from "@/lib/format";
import type { ContractRow, ContractStatus } from "@/lib/types";
import { Alert, EmptyState, LoadingScreen, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

const filterOptions: { value: ContractStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "parcial", label: "Parcial" },
  { value: "pagado", label: "Pagado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function CalendarPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<ContractStatus[]>([]);

  useEffect(() => {
    let active = true;
    listContracts()
      .then((data) => {
        if (active) setContracts(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar el calendario.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const events = useMemo<EventInput[]>(() => {
    return contracts
      .filter((contract) => !hidden.includes(contract.status))
      .map((contract) => {
        const meta = statusMeta[contract.status];
        const start = contract.start_time
          ? `${contract.event_date}T${contract.start_time}`
          : contract.event_date;
        const end = contract.end_time ? `${contract.event_date}T${contract.end_time}` : undefined;

        return {
          id: contract.id,
          title: `${contract.honoree_name || contract.event_type || "Evento"}${
            contract.client_name ? ` · ${contract.client_name}` : ""
          }`,
          start,
          end,
          allDay: !contract.start_time,
          backgroundColor: meta.calendar,
          borderColor: meta.calendar,
          textColor: contract.status === "pendiente" || contract.status === "parcial" ? "#1f2937" : "#ffffff",
          url: `/contratos/ver/?id=${contract.id}`,
          extendedProps: {
            folio: contract.folio,
            remaining: contract.remaining,
            price: contract.total,
            status: contract.status,
          },
        };
      });
  }, [contracts, hidden]);

  const toggleFilter = (status: ContractStatus) => {
    setHidden((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
    );
  };

  if (loading) return <LoadingScreen label="Cargando calendario…" />;

  return (
    <div>
      <PageHeader
        title="Calendario"
        description="Eventos agendados. Amarillo: falta pago · Verde: pagado completo · Gris: cancelado."
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const active = !hidden.includes(option.value);
          const meta = statusMeta[option.value];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleFilter(option.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "border-line bg-white text-slate-700"
                  : "border-transparent bg-slate-100 text-slate-400",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              {option.label}
            </button>
          );
        })}
      </div>

      {contracts.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Sin eventos en la agenda"
            description="Cuando registres contratos aparecerán en el calendario."
            icon={<CalendarDays className="h-10 w-10" />}
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-3 sm:p-5">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek",
            }}
            buttonText={{ today: "Hoy", month: "Mes", week: "Semana" }}
            height={720}
            events={events}
            eventClick={(info) => {
              info.jsEvent.preventDefault();
              if (info.event.url) router.push(info.event.url);
            }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventContent={(arg) => {
              const remaining = Number(arg.event.extendedProps.remaining ?? 0);
              return (
                <div className="overflow-hidden px-1 py-0.5 text-[11px] leading-tight">
                  <p className="truncate font-semibold">{arg.event.title}</p>
                  <p className="truncate opacity-90">
                    {arg.timeText ? `${arg.timeText} · ` : ""}
                    {remaining > 0 ? `Resta ${money(remaining)}` : "Pagado"}
                  </p>
                </div>
              );
            }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Pendiente o parcial
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Pagado completo
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Cancelado
        </span>
      </div>
    </div>
  );
}
