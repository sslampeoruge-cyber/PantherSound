"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, TrendingUp, Wallet } from "lucide-react";
import { listContracts, listPaymentsWithContracts } from "@/lib/api";
import { formatDate, money, monthRange, paymentMethodLabels } from "@/lib/format";
import type { ContractRow, PaymentWithContract } from "@/lib/types";
import {
  Alert,
  EmptyState,
  LoadingScreen,
  PageHeader,
  StatCard,
} from "@/components/ui";

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.start);
  const [to, setTo] = useState(initial.end);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [payments, setPayments] = useState<PaymentWithContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([listContracts(), listPaymentsWithContracts(from, to)])
      .then(([contractsData, paymentsData]) => {
        if (!active) return;
        setContracts(contractsData);
        setPayments(paymentsData);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar los reportes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [from, to]);

  const contractMap = useMemo(() => {
    const map = new Map<string, ContractRow>();
    contracts.forEach((contract) => map.set(contract.id, contract));
    return map;
  }, [contracts]);

  const stats = useMemo(() => {
    const rangeContracts = contracts.filter(
      (contract) =>
        contract.event_date >= from &&
        contract.event_date <= to &&
        contract.status !== "cancelado",
    );
    const totalContracted = rangeContracts.reduce(
      (sum, contract) => sum + Number(contract.price),
      0,
    );
    const outstanding = rangeContracts.reduce(
      (sum, contract) => sum + Math.max(Number(contract.remaining), 0),
      0,
    );
    const collected = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      totalContracted,
      outstanding,
      collected,
      count: rangeContracts.length,
    };
  }, [contracts, payments, from, to]);

  const exportRows = useMemo(
    () =>
      payments.map((payment) => {
        const contract = contractMap.get(payment.contract_id);
        return {
          Fecha: payment.paid_at,
          Folio: contract?.folio ?? payment.contracts?.folio ?? "",
          Cliente: contract?.client_name ?? "",
          Festejado: contract?.honoree_name ?? payment.contracts?.honoree_name ?? "",
          Monto: Number(payment.amount),
          Método: paymentMethodLabels[payment.method],
          Referencia: payment.reference ?? "",
          Notas: payment.notes ?? "",
        };
      }),
    [payments, contractMap],
  );

  const exportCsv = () => {
    const headers = ["Fecha", "Folio", "Cliente", "Festejado", "Monto", "Método", "Referencia", "Notas"];
    const lines = [headers.join(",")];
    exportRows.forEach((row) => {
      lines.push(
        [
          row.Fecha,
          row.Folio,
          row.Cliente,
          row.Festejado,
          row.Monto,
          row.Método,
          row.Referencia,
          row.Notas,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      );
    });
    downloadBlob(`\uFEFF${lines.join("\n")}`, `anticipos-${from}-a-${to}.csv`, "text/csv;charset=utf-8");
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Anticipos");
    XLSX.writeFile(workbook, `anticipos-${from}-a-${to}.xlsx`);
  };

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Ingresos, saldos e historial de anticipos por rango de fechas."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={exportCsv} disabled={payments.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void exportExcel()}
              disabled={payments.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="report-from">
            Desde
          </label>
          <input
            id="report-from"
            type="date"
            className="input"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="report-to">
            Hasta
          </label>
          <input
            id="report-to"
            type="date"
            className="input"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-slate-500">
            Los pagos se filtran por fecha de abono; los contratos por fecha de evento.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Contratos en el rango"
          value={String(stats.count)}
          hint="Excluye cancelados"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Total contratado"
          value={money(stats.totalContracted)}
          icon={<FileSpreadsheet className="h-5 w-5" />}
        />
        <StatCard
          label="Anticipos cobrados"
          value={money(stats.collected)}
          hint={`${payments.length} abono${payments.length === 1 ? "" : "s"}`}
          icon={<Wallet className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Saldo por cobrar"
          value={money(stats.outstanding)}
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Historial de anticipos</h2>
          <p className="text-xs text-slate-500">
            {formatDate(from)} — {formatDate(to)}
          </p>
        </div>

        {loading ? (
          <LoadingScreen label="Cargando reportes…" />
        ) : payments.length === 0 ? (
          <EmptyState
            title="Sin anticipos en el rango"
            description="Cambia las fechas o registra pagos en los contratos."
            icon={<Wallet className="h-10 w-10" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Festejado</th>
                  <th className="text-right">Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const contract = contractMap.get(payment.contract_id);
                  return (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.paid_at)}</td>
                      <td className="font-semibold text-slate-900">
                        {contract?.folio ?? payment.contracts?.folio ?? "—"}
                      </td>
                      <td>{contract?.client_name || "—"}</td>
                      <td>{contract?.honoree_name ?? payment.contracts?.honoree_name ?? "—"}</td>
                      <td className="text-right font-semibold text-emerald-700">
                        {money(payment.amount)}
                      </td>
                      <td>{paymentMethodLabels[payment.method]}</td>
                      <td>{payment.reference || "—"}</td>
                      <td className="max-w-48 truncate">{payment.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
