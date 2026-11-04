"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getContract } from "@/lib/api";
import { ContractForm } from "@/components/ContractForm";
import { Alert, LoadingScreen, PageHeader } from "@/components/ui";
import type { ContractRow } from "@/lib/types";

function EditContractContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No se indicó el contrato.");
      setLoading(false);
      return;
    }

    getContract(id)
      .then((data) => {
        if (!data) {
          setError("El contrato no existe o no tienes permiso para verlo.");
        } else {
          setContract(data);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el contrato.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingScreen label="Cargando contrato…" />;

  if (error || !contract) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error ?? "Contrato no encontrado."}</Alert>
        <Link href="/contratos/" className="btn-secondary">
          Volver a contratos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Editar ${contract.folio}`}
        description="Actualiza los datos del evento."
      />
      <ContractForm
        contract={contract}
        onSaved={(contractId) => router.replace(`/contratos/ver/?id=${contractId}`)}
        onCancel={() => router.push(`/contratos/ver/?id=${contract.id}`)}
      />
    </div>
  );
}

export default function EditContractPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Cargando contrato…" />}>
      <EditContractContent />
    </Suspense>
  );
}
