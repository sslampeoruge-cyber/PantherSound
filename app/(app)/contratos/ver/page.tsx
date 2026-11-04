"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  createSignedUrl,
  getContract,
  listAttachments,
  listClauses,
  listPayments,
  uploadContractFile,
} from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  formatDate,
  formatTime,
  money,
  paymentMethodLabels,
  statusMeta,
  todayISO,
} from "@/lib/format";
import { downloadContractPdf } from "@/lib/pdf";
import type {
  Attachment,
  Clause,
  ContractRow,
  Payment,
  PaymentMethod,
} from "@/lib/types";
import {
  Alert,
  LoadingScreen,
  Modal,
  StatusBadge,
} from "@/components/ui";
import { cn } from "@/lib/cn";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ContractDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { profile, user } = useAuth();

  const [contract, setContract] = useState<ContractRow | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paid_at: todayISO(),
    method: "efectivo" as PaymentMethod,
    reference: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState("foto");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canEdit =
    profile?.role === "admin" ||
    (profile?.role === "vendedor" && contract?.created_by === user?.id);
  const isAdmin = profile?.role === "admin";

  const load = async (contractId: string) => {
    const [contractData, paymentsData, attachmentsData, clausesData] = await Promise.all([
      getContract(contractId),
      listPayments(contractId),
      listAttachments(contractId),
      listClauses(true),
    ]);

    if (!contractData) {
      throw new Error("El contrato no existe o no tienes permiso para verlo.");
    }

    setContract(contractData);
    setPayments(paymentsData);
    setAttachments(attachmentsData);
    setClauses(clausesData);
  };

  useEffect(() => {
    if (!id) {
      setError("No se indicó el contrato.");
      setLoading(false);
      return;
    }

    load(id)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el contrato.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = async () => {
    if (id) await load(id);
  };

  const onDownloadPdf = async () => {
    if (!contract) return;
    setPdfLoading(true);
    setActionError(null);
    try {
      await downloadContractPdf(contract, clauses, payments);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const onCancelContract = async () => {
    if (!contract) return;
    const { error: cancelError } = await getSupabase()
      .from("contracts")
      .update({
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason.trim() || null,
      })
      .eq("id", contract.id);
    if (cancelError) {
      setActionError(cancelError.message);
      return;
    }
    setCancelOpen(false);
    setCancelReason("");
    await refresh();
  };

  const onDeleteContract = async () => {
    if (!contract) return;
    if (
      !window.confirm(
        `¿Eliminar el contrato ${contract.folio}? Se ocultará del sistema pero se conservará el historial.`,
      )
    ) {
      return;
    }
    const { error: deleteError } = await getSupabase()
      .from("contracts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", contract.id);
    if (deleteError) {
      setActionError(deleteError.message);
      return;
    }
    router.replace("/contratos/");
  };

  const onAddPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contract) return;
    setPaymentError(null);

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Escribe un monto mayor a cero.");
      return;
    }
    if (!paymentForm.paid_at) {
      setPaymentError("Selecciona la fecha del pago.");
      return;
    }

    setPaymentSaving(true);
    try {
      let receiptPath: string | null = null;
      if (receiptFile) {
        receiptPath = await uploadContractFile(contract.id, receiptFile);
      }

      const { error: insertError } = await getSupabase().from("payments").insert({
        contract_id: contract.id,
        amount,
        paid_at: paymentForm.paid_at,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || null,
        notes: paymentForm.notes.trim() || null,
        receipt_path: receiptPath,
        created_by: user?.id ?? null,
      });
      if (insertError) throw new Error(insertError.message);

      setPaymentForm({
        amount: "",
        paid_at: todayISO(),
        method: "efectivo",
        reference: "",
        notes: "",
      });
      setReceiptFile(null);
      await refresh();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const onUploadAttachment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contract || !uploadFile) return;
    setUploadError(null);
    setUploading(true);
    try {
      const path = await uploadContractFile(contract.id, uploadFile);
      const { error: insertError } = await getSupabase().from("attachments").insert({
        contract_id: contract.id,
        storage_path: path,
        kind: uploadKind,
        file_name: uploadFile.name,
        uploaded_by: user?.id ?? null,
      });
      if (insertError) throw new Error(insertError.message);
      setUploadFile(null);
      await refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  const onDeleteAttachment = async (attachment: Attachment) => {
    if (!window.confirm("¿Eliminar este archivo?")) return;
    const { error: deleteError } = await getSupabase()
      .from("attachments")
      .delete()
      .eq("id", attachment.id);
    if (deleteError) {
      setActionError(deleteError.message);
      return;
    }
    await getSupabase().storage.from("contracts").remove([attachment.storage_path]);
    await refresh();
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    const url = await createSignedUrl(path);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setActionError("No se pudo abrir el archivo.");
    }
  };

  if (loading) return <LoadingScreen label="Cargando contrato…" />;

  if (error || !contract) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error ?? "Contrato no encontrado."}</Alert>
        <Link href="/contratos/" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Volver a contratos
        </Link>
      </div>
    );
  }

  const meta = statusMeta[contract.status];
  const progress =
    contract.price > 0
      ? Math.min(100, Math.round((Number(contract.paid_total) / Number(contract.price)) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/contratos/"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Contratos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{contract.folio}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {contract.honoree_name || contract.event_type || "Evento"} ·{" "}
            {formatDate(contract.event_date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void onDownloadPdf()}
            disabled={pdfLoading}
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </button>
          {canEdit && contract.status !== "cancelado" ? (
            <Link href={`/contratos/editar/?id=${contract.id}`} className="btn-secondary">
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          ) : null}
          {canEdit && contract.status !== "cancelado" ? (
            <button type="button" className="btn-secondary text-amber-700" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4" /> Cancelar
            </button>
          ) : null}
          {isAdmin ? (
            <button type="button" className="btn-danger" onClick={() => void onDeleteContract()}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      {contract.cancelled_at ? (
        <Alert tone="warning">
          Contrato cancelado el {formatDate(contract.cancelled_at)}
          {contract.cancel_reason ? ` · Motivo: ${contract.cancel_reason}` : ""}.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Datos del evento
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailRow label="Fecha" value={formatDate(contract.event_date)} />
              <DetailRow
                label="Horario"
                value={`${formatTime(contract.start_time)} – ${formatTime(contract.end_time)}`}
              />
              <DetailRow label="Salón" value={contract.venue_name || "—"} />
              <DetailRow label="Cliente" value={contract.client_name || "—"} />
              <DetailRow label="Teléfono" value={contract.client_phone || "—"} />
              <DetailRow label="Festejado" value={contract.honoree_name || "—"} />
              <DetailRow label="Tipo de evento" value={contract.event_type || "—"} />
              <DetailRow label="Representante" value={contract.representative_name || "—"} />
              <DetailRow label="Firma" value={formatDate(contract.signed_at)} />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Servicio contratado
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailRow label="Sonido" value={contract.sound_name || "—"} />
              <DetailRow label="Detalle" value={contract.sound_notes || "—"} />
              <DetailRow label="Fotos" value={contract.photos ? "Sí" : "No"} />
              <DetailRow label="Tipo de cuadro" value={contract.frame_name || "—"} />
              <DetailRow label="Filmación" value={contract.filming ? "Sí" : "No"} />
              <DetailRow label="Grabar en" value={contract.recording_location || "—"} />
            </div>
            {contract.observations ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Observaciones
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {contract.observations}
                </p>
              </div>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Anticipos y pagos</h2>
                <p className="text-xs text-slate-500">Historial de abonos con fecha</p>
              </div>
              <span className="badge bg-emerald-100 text-emerald-800">
                {money(contract.paid_total)} cobrado
              </span>
            </div>

            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Aún no hay pagos registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th className="text-right">Monto</th>
                      <th>Método</th>
                      <th>Referencia</th>
                      <th>Notas</th>
                      <th className="text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.paid_at)}</td>
                        <td className="text-right font-semibold text-emerald-700">
                          {money(payment.amount)}
                        </td>
                        <td>{paymentMethodLabels[payment.method]}</td>
                        <td>{payment.reference || "—"}</td>
                        <td className="max-w-48 truncate">{payment.notes || "—"}</td>
                        <td className="text-right">
                          {payment.receipt_path ? (
                            <button
                              type="button"
                              className="text-sm font-semibold text-brand hover:underline"
                              onClick={() => void openFile(payment.receipt_path)}
                            >
                              Ver
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canEdit && contract.status !== "cancelado" ? (
              <form className="border-t border-line bg-slate-50/60 p-5" onSubmit={onAddPayment}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Registrar anticipo</h3>
                {paymentError ? (
                  <div className="mb-3">
                    <Alert tone="error">{paymentError}</Alert>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="pay-amount">
                      Monto *
                    </label>
                    <input
                      id="pay-amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      className="input"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm({ ...paymentForm, amount: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="pay-date">
                      Fecha *
                    </label>
                    <input
                      id="pay-date"
                      type="date"
                      className="input"
                      value={paymentForm.paid_at}
                      onChange={(event) =>
                        setPaymentForm({ ...paymentForm, paid_at: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="pay-method">
                      Método
                    </label>
                    <select
                      id="pay-method"
                      className="input"
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          method: event.target.value as PaymentMethod,
                        })
                      }
                    >
                      {Object.entries(paymentMethodLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="pay-reference">
                      Referencia
                    </label>
                    <input
                      id="pay-reference"
                      className="input"
                      value={paymentForm.reference}
                      onChange={(event) =>
                        setPaymentForm({ ...paymentForm, reference: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="pay-receipt">
                      Comprobante
                    </label>
                    <input
                      id="pay-receipt"
                      type="file"
                      className="input file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand"
                      onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="pay-notes">
                      Notas
                    </label>
                    <input
                      id="pay-notes"
                      className="input"
                      value={paymentForm.notes}
                      onChange={(event) =>
                        setPaymentForm({ ...paymentForm, notes: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="submit" className="btn-primary" disabled={paymentSaving}>
                    {paymentSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Registrar pago
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Fotos y archivos</h2>
              <p className="text-xs text-slate-500">Imágenes o documentos del evento</p>
            </div>

            {attachments.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">
                No hay archivos adjuntos.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {attachment.file_name || attachment.storage_path}
                      </p>
                      <p className="text-xs text-slate-500">
                        {attachment.kind} · {formatDate(attachment.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-brand hover:underline"
                      onClick={() => void openFile(attachment.storage_path)}
                    >
                      Abrir
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn-ghost h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => void onDeleteAttachment(attachment)}
                        aria-label="Eliminar archivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && contract.status !== "cancelado" ? (
              <form className="border-t border-line bg-slate-50/60 p-5" onSubmit={onUploadAttachment}>
                {uploadError ? (
                  <div className="mb-3">
                    <Alert tone="error">{uploadError}</Alert>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="label" htmlFor="attachment-file">
                      Archivo
                    </label>
                    <input
                      id="attachment-file"
                      type="file"
                      className="input file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand"
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="sm:w-44">
                    <label className="label" htmlFor="attachment-kind">
                      Tipo
                    </label>
                    <select
                      id="attachment-kind"
                      className="input"
                      value={uploadKind}
                      onChange={(event) => setUploadKind(event.target.value)}
                    >
                      <option value="foto">Foto</option>
                      <option value="comprobante">Comprobante</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-secondary" disabled={!uploadFile || uploading}>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Subir
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Resumen de pago
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Precio</span>
                <span className="font-semibold text-slate-900">{money(contract.price)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Pagado</span>
                <span className="font-semibold text-emerald-700">{money(contract.paid_total)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="font-medium text-slate-700">Restante</span>
                <span className="text-lg font-bold text-amber-700">{money(contract.remaining)}</span>
              </div>
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full", contract.remaining <= 0 ? "bg-emerald-500" : "bg-amber-500")}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{progress}% pagado</p>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {formatDate(contract.event_date)}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Wallet className="h-4 w-4 text-slate-400" />
                {payments.length} pago{payments.length === 1 ? "" : "s"} registrado
                {payments.length === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                {meta.label}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Cláusulas del contrato
            </h2>
            <ol className="space-y-2 text-xs leading-relaxed text-slate-600">
              {clauses.map((clause) => (
                <li key={clause.id} className="flex gap-2">
                  <span className="font-semibold text-brand">{clause.position}.</span>
                  <span>{clause.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancelar contrato ${contract.folio}`}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setCancelOpen(false)}>
              Volver
            </button>
            <button type="button" className="btn-danger" onClick={() => void onCancelContract()}>
              Confirmar cancelación
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          El contrato quedará marcado como cancelado y se conservará en el historial.
        </p>
        <label className="label" htmlFor="cancel-reason">
          Motivo (opcional)
        </label>
        <textarea
          id="cancel-reason"
          className="input min-h-24"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}

export default function ContractDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Cargando contrato…" />}>
      <ContractDetailContent />
    </Suspense>
  );
}
