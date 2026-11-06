import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Clause, ContractRow, Payment } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#6d28d9",
    paddingBottom: 10,
    marginBottom: 12,
  },
  logo: { width: 62, height: 62, objectFit: "contain", marginRight: 12 },
  logoPlaceholder: {
    width: 62,
    height: 62,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  logoPlaceholderText: { fontSize: 7, color: "#8b5cf6" },
  company: { flex: 1 },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#4c1d95" },
  companySub: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  folioBox: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  folioLabel: { fontSize: 6, letterSpacing: 1, color: "#7c3aed" },
  folio: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#4c1d95" },
  title: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginBottom: 10,
    color: "#111827",
  },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6d28d9",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", paddingRight: 8, marginBottom: 5 },
  cellFull: { width: "100%", marginBottom: 5 },
  label: { fontSize: 7, color: "#6b7280" },
  value: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111827" },
  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableRowLast: { flexDirection: "row" },
  tableHeader: { backgroundColor: "#f5f3ff" },
  tableCellLabel: {
    width: "45%",
    padding: 6,
    fontSize: 8,
    color: "#4b5563",
    backgroundColor: "#fafafa",
  },
  tableCellValue: { width: "55%", padding: 6, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  moneyLabel: { fontSize: 9, color: "#4b5563" },
  moneyValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
    paddingTop: 5,
  },
  clause: { flexDirection: "row", marginBottom: 4 },
  clauseNumber: { width: 16, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#6d28d9" },
  clauseText: { flex: 1, fontSize: 8.5, lineHeight: 1.35 },
  signatures: { flexDirection: "row", marginTop: 28 },
  signature: { flex: 1, alignItems: "center", paddingHorizontal: 16 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#374151", width: "100%", marginBottom: 4 },
  signatureRole: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151" },
  signatureName: { fontSize: 8, color: "#4b5563", marginTop: 1 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 4,
  },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function TableRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={last ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.tableCellLabel}>{label}</Text>
      <Text style={styles.tableCellValue}>{value}</Text>
    </View>
  );
}

export function ContractPdf({
  contract,
  clauses,
  payments,
  logoUrl,
}: {
  contract: ContractRow;
  clauses: Clause[];
  payments: Payment[];
  logoUrl?: string | null;
}) {
  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (value: string | null) => (value ? value.slice(0, 5) : "—");
  const money = (value: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);

  return (
    <Document
      title={`Contrato ${contract.folio}`}
      author="PantherSound Luz y Sonido"
      subject="Contrato de servicio"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>LOGO</Text>
            </View>
          )}
          <View style={styles.company}>
            <Text style={styles.companyName}>LUZ Y SONIDO</Text>
            <Text style={styles.companySub}>PantherSound</Text>
            <Text style={styles.companySub}>
              Vic. Guerrero y Priv. Los Pinos, San José secc. 11
            </Text>
            <Text style={styles.companySub}>
              San Juan Xiutetelco, Pue. · Tel. 231 322 1683 / 231 322 1623
            </Text>
          </View>
          <View style={styles.folioBox}>
            <Text style={styles.folioLabel}>FOLIO</Text>
            <Text style={styles.folio}>{contract.folio}</Text>
          </View>
        </View>

        <Text style={styles.title}>CONTRATO DE SERVICIO</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del evento</Text>
          <View style={styles.grid}>
            <Field label="Fecha del evento" value={formatDate(contract.event_date)} />
            <Field
              label="Horario"
              value={`${formatTime(contract.start_time)} a ${formatTime(contract.end_time)}`}
            />
            <Field label="Calle 1" value={contract.address_line1 || "—"} />
            <Field label="Calle 2" value={contract.address_line2 || "—"} />
            <Field label="Salón" value={contract.venue_name || "—"} />
            <Field label="Tipo de evento" value={contract.event_type || "—"} />
            <Field
              label="Contratante"
              value={contract.contractor_name || contract.client_name || "—"}
            />
            <Field label="Nombre del festejado" value={contract.honoree_name || "—"} />
            <Field label="Teléfono" value={contract.client_phone || "—"} />
            <Field label="Fecha de firma" value={formatDate(contract.signed_at)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicio contratado</Text>
          <View style={styles.table}>
            <TableRow label="Tamaño / paquete de sonido" value={contract.sound_name || "—"} />
            <TableRow label="Detalle del sonido" value={contract.sound_notes || "—"} />
            <TableRow
              label="Fotos"
              value={
                contract.photos
                  ? `Sí incluye${contract.photos_price > 0 ? ` · ${money(contract.photos_price)}` : ""}`
                  : "No incluye"
              }
            />
            <TableRow label="Tipo de cuadro" value={contract.frame_name || "—"} />
            <TableRow
              label="Filmación"
              value={
                contract.filming
                  ? `Sí incluye${contract.filming_price > 0 ? ` · ${money(contract.filming_price)}` : ""}`
                  : "No incluye"
              }
            />
            <TableRow label="Grabar en" value={contract.recording_location || "—"} last />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de pago</Text>
          <View style={styles.table}>
            <View style={{ padding: 8 }}>
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Precio del servicio (sonido)</Text>
                <Text style={styles.moneyValue}>{money(contract.price)}</Text>
              </View>
              {contract.photos_price > 0 ? (
                <View style={styles.moneyRow}>
                  <Text style={styles.moneyLabel}>Fotos</Text>
                  <Text style={styles.moneyValue}>{money(contract.photos_price)}</Text>
                </View>
              ) : null}
              {contract.filming_price > 0 ? (
                <View style={styles.moneyRow}>
                  <Text style={styles.moneyLabel}>Filmación</Text>
                  <Text style={styles.moneyValue}>{money(contract.filming_price)}</Text>
                </View>
              ) : null}
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Total del contrato</Text>
                <Text style={styles.moneyValue}>{money(contract.total)}</Text>
              </View>
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Anticipos y abonos</Text>
                <Text style={styles.moneyValue}>{money(contract.paid_total)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.moneyLabel}>Restante por pagar</Text>
                <Text style={styles.moneyValue}>{money(contract.remaining)}</Text>
              </View>
            </View>
          </View>
          {payments.length > 0 ? (
            <View style={{ marginTop: 5 }}>
              <Text style={styles.label}>
                Abonos registrados:{" "}
                {payments
                  .map((payment) => `${formatDate(payment.paid_at)} · ${money(payment.amount)}`)
                  .join("   |   ")}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cláusulas</Text>
          {clauses.map((clause, index) => (
            <View key={clause.id} style={styles.clause}>
              <Text style={styles.clauseNumber}>{index + 1}.-</Text>
              <Text style={styles.clauseText}>{clause.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observaciones</Text>
          <Text style={{ fontSize: 8.5, lineHeight: 1.35 }}>
            {contract.observations || "Sin observaciones."}
          </Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>CONTRATANTE</Text>
            <Text style={styles.signatureName}>
              {contract.contractor_name || contract.client_name || "Nombre y firma"}
            </Text>
          </View>
          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>REPRESENTANTE</Text>
            <Text style={styles.signatureName}>
              {contract.representative_name || "Nombre y firma"}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          PantherSound · Luz y Sonido · Documento generado el{" "}
          {new Date().toLocaleDateString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
}
