"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listContracts, listPaymentsWithContracts } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  formatDate,
  formatLongDate,
  formatTime,
  money,
  monthRange,
  statusMeta,
  toISODate,
  todayISO,
} from "@/lib/format";
import type { ContractRow, PaymentWithContract } from "@/lib/types";
import { Alert, EmptyState, LoadingScreen, PageHeader, StatCard, StatusBadge } from "@/components/ui";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [payments, setPayments] = useState<PaymentWithContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const range = monthRange();

  useEffect(() => {
    let active = true;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    Promise.all([
      listContracts(),
      listPaymentsWithContracts(toISODate(sixMonthsAgo), range.end),
    ])
      .then(([contractsData, paymentsData]) => {
        if (!active) return;
        setContracts(contractsData);
        setPayments(paymentsData);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar el panel.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range.end]);

  const stats = useMemo(() => {
    const activeContracts = contracts.filter((contract) => contract.status !== "cancelado");
    const monthContracts = activeContracts.filter((contract) =>
      contract.event_date.startsWith(currentMonth),
    );
    const upcoming = activeContracts
      .filter((contract) => contract.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 6);

    const collectedThisMonth = payments
      .filter((payment) => payment.paid_at.startsWith(currentMonth))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const outstanding = activeContracts.reduce(
      (sum, contract) => sum + Math.max(Number(contract.remaining), 0),
      0,
    );

    const totalContracted = activeContracts.reduce(
      (sum, contract) => sum + Number(contract.price),
      0,
    );

    const chartData = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = monthKey(date);
      const total = payments
        .filter((payment) => payment.paid_at.startsWith(key))
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return {
        mes: date.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
        total,
      };
    });

    return {
      monthCount: monthContracts.length,
      collectedThisMonth,
      outstanding,
      totalContracted,
      upcoming,
      chartData,
    };
  }, [contracts, payments, currentMonth, today]);

  if (loading) return <LoadingScreen label="Cargando panel…" />;

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile?.full_name?.split(" ")[0] || "bienvenido"}`}
        description={`Resumen de ${formatLongDate(today)}`}
        actions={
          <Link href="/contratos/nuevo/" className="btn-primary">
            Nuevo contrato
          </Link>
        }
      />

      {error ? (
        <div className="mb-6">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Eventos este mes"
          value={String(stats.monthCount)}
          hint="Contratos activos del mes"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Cobrado este mes"
          value={money(stats.collectedThisMonth)}
          hint="Anticipos y pagos recibidos"
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Saldo por cobrar"
          value={money(stats.outstanding)}
          hint="En contratos activos"
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Total contratado"
          value={money(stats.totalContracted)}
          hint="Contratos activos"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Próximos eventos</h2>
              <p className="text-xs text-slate-500">Los siguientes en la agenda</p>
            </div>
            <Link
              href="/calendario/"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Ver calendario <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {stats.upcoming.length === 0 ? (
            <EmptyState
              title="No hay eventos próximos"
              description="Cuando registres contratos con fecha futura aparecerán aquí."
              icon={<CalendarClock className="h-10 w-10" />}
            />
          ) : (
            <ul className="divide-y divide-line">
              {stats.upcoming.map((contract) => {
                const meta = statusMeta[contract.status];
                return (
                  <li key={contract.id}>
                    <Link
                      href={`/contratos/ver/?id=${contract.id}`}
                      className="flex items-center gap-4 py-3 transition hover:bg-slate-50/60"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: meta.calendar }}
                      >
                        <span className="text-[10px] font-semibold uppercase leading-none">
                          {new Date(`${contract.event_date}T12:00:00`)
                            .toLocaleDateString("es-MX", { month: "short" })
                            .replace(".", "")}
                        </span>
                        <span className="text-base font-bold leading-tight">
                          {contract.event_date.slice(8, 10)}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {contract.honoree_name || contract.event_type || "Evento"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {contract.client_name || "Sin cliente"} · {formatTime(contract.start_time)}
                          {contract.venue_name ? ` · ${contract.venue_name}` : ""}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold text-slate-900">{money(contract.price)}</p>
                        <p className="text-xs text-slate-500">Resta {money(contract.remaining)}</p>
                      </div>
                      <StatusBadge status={contract.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Ingresos por mes</h2>
          <p className="text-xs text-slate-500">Últimos 6 meses de anticipos cobrados</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e5ee" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b6a7b" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b6a7b" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value) => money(Number(value))}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e6e5ee", fontSize: 12 }}
                />
                <Bar dataKey="total" fill="#6d28d9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Eventos del mes</h2>
            <p className="text-xs text-slate-500">{formatDate(range.start)} — {formatDate(range.end)}</p>
          </div>
          <Link href="/contratos/" className="text-sm font-semibold text-brand hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Festejado</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Resta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {contracts
                .filter((contract) => contract.event_date.startsWith(currentMonth))
                .slice(0, 8)
                .map((contract) => (
                  <tr key={contract.id}>
                    <td>{formatDate(contract.event_date)}</td>
                    <td>
                      <Link
                        href={`/contratos/ver/?id=${contract.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {contract.folio}
                      </Link>
                    </td>
                    <td>{contract.client_name || "—"}</td>
                    <td>{contract.honoree_name || "—"}</td>
                    <td className="text-right">{money(contract.price)}</td>
                    <td className="text-right">{money(contract.remaining)}</td>
                    <td>
                      <StatusBadge status={contract.status} />
                    </td>
                  </tr>
                ))}
              {contracts.filter((contract) => contract.event_date.startsWith(currentMonth)).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    No hay contratos registrados este mes.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
