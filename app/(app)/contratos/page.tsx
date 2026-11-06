"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Pencil, Plus, Search } from "lucide-react";
import { listContracts } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import type { ContractRow, ContractStatus } from "@/lib/types";
import {
  Alert,
  EmptyState,
  LoadingScreen,
  PageHeader,
  StatusBadge,
} from "@/components/ui";

const statusOptions: { value: "" | ContractStatus; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente de pago" },
  { value: "parcial", label: "Pago parcial" },
  { value: "pagado", label: "Pagado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function ContractsPage() {
  const { profile, user } = useAuth();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ContractStatus>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const canCreate = profile?.role === "admin" || profile?.role === "vendedor";

  useEffect(() => {
    let active = true;
    listContracts()
      .then((data) => {
        if (active) setContracts(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar los contratos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      if (status && contract.status !== status) return false;
      if (from && contract.event_date < from) return false;
      if (to && contract.event_date > to) return false;
      if (!term) return true;
      return [
        contract.folio,
        contract.client_name,
        contract.honoree_name,
        contract.event_type,
        contract.venue_name,
        contract.representative_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [contracts, search, status, from, to]);

  const canEdit = (contract: ContractRow) =>
    profile?.role === "admin" || (profile?.role === "vendedor" && contract.created_by === user?.id);

  if (loading) return <LoadingScreen label="Cargando contratos…" />;

  const totals = filtered.reduce(
    (acc, contract) => {
      if (contract.status !== "cancelado") {
        acc.price += Number(contract.total);
        acc.paid += Number(contract.paid_total);
        acc.remaining += Math.max(Number(contract.remaining), 0);
      }
      return acc;
    },
    { price: 0, paid: 0, remaining: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Todos los eventos registrados y su estado de pago."
        actions={
          canCreate ? (
            <Link href="/contratos/nuevo/" className="btn-primary">
              <Plus className="h-4 w-4" /> Nuevo contrato
            </Link>
          ) : null
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total filtrado</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{money(totals.price)}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cobrado</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{money(totals.paid)}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Por cobrar</p>
          <p className="mt-1 text-lg font-bold text-amber-700">{money(totals.remaining)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar folio, contratante, festejado…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | ContractStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-xs text-slate-500" htmlFor="from">
              Desde
            </label>
            <input
              id="from"
              type="date"
              className="input"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500" htmlFor="to">
              Hasta
            </label>
            <input
              id="to"
              type="date"
              className="input"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Sin contratos"
            description="No hay contratos que coincidan con los filtros."
            icon={<FileText className="h-10 w-10" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Contratante</th>
                  <th>Festejado</th>
                  <th>Salón</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Pagado</th>
                  <th className="text-right">Resta</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contract) => (
                  <tr key={contract.id}>
                    <td className="font-semibold text-slate-900">{contract.folio}</td>
                    <td>{formatDate(contract.event_date)}</td>
                    <td>{contract.client_name || "—"}</td>
                    <td>{contract.honoree_name || "—"}</td>
                    <td>{contract.venue_name || "—"}</td>
                    <td className="text-right">{money(contract.total)}</td>
                    <td className="text-right text-emerald-700">{money(contract.paid_total)}</td>
                    <td className="text-right text-amber-700">{money(contract.remaining)}</td>
                    <td>
                      <StatusBadge status={contract.status} />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/contratos/ver/?id=${contract.id}`}
                          className="btn-ghost h-8 w-8 p-0"
                          aria-label={`Ver ${contract.folio}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canEdit(contract) && contract.status !== "cancelado" ? (
                          <Link
                            href={`/contratos/editar/?id=${contract.id}`}
                            className="btn-ghost h-8 w-8 p-0"
                            aria-label={`Editar ${contract.folio}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
