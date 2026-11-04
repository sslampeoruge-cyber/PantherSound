import type { ContractStatus, PaymentMethod, Role } from "./types";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function money(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  return currencyFormatter.format(Number.isFinite(n as number) ? (n as number) : 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatLongDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return longDateFormatter.format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

export function monthRange(date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  consulta: "Consulta",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

interface StatusMeta {
  label: string;
  badge: string;
  calendar: string;
  dot: string;
}

export const statusMeta: Record<ContractStatus, StatusMeta> = {
  pendiente: {
    label: "Pendiente de pago",
    badge: "bg-amber-100 text-amber-800",
    calendar: "#f59e0b",
    dot: "bg-amber-500",
  },
  parcial: {
    label: "Pago parcial",
    badge: "bg-amber-100 text-amber-800",
    calendar: "#f59e0b",
    dot: "bg-amber-500",
  },
  pagado: {
    label: "Pagado",
    badge: "bg-emerald-100 text-emerald-800",
    calendar: "#10b981",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    badge: "bg-slate-200 text-slate-600",
    calendar: "#94a3b8",
    dot: "bg-slate-400",
  },
};
