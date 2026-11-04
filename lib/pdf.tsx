import type { Clause, ContractRow, Payment } from "./types";

export async function downloadContractPdf(
  contract: ContractRow,
  clauses: Clause[],
  payments: Payment[],
) {
  const [{ pdf }, { ContractPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/ContractPdf"),
  ]);

  let logoUrl: string | null = null;
  try {
    const response = await fetch("/logo.png", { method: "HEAD" });
    if (response.ok) {
      logoUrl = `${window.location.origin}/logo.png`;
    }
  } catch {
    logoUrl = null;
  }

  const blob = await pdf(
    <ContractPdf
      contract={contract}
      clauses={clauses}
      payments={payments}
      logoUrl={logoUrl}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${contract.folio}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
