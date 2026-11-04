"use client";

import { useRouter } from "next/navigation";
import { ContractForm } from "@/components/ContractForm";
import { PageHeader } from "@/components/ui";

export default function NewContractPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Nuevo contrato"
        description="Captura los datos del evento. El folio se genera automáticamente."
      />
      <ContractForm
        onSaved={(id) => router.replace(`/contratos/ver/?id=${id}`)}
        onCancel={() => router.push("/contratos/")}
      />
    </div>
  );
}
