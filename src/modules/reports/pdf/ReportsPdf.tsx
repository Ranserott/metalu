// src/modules/reports/pdf/ReportsPdf.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_FONT_FAMILY } from "@/lib/pdf/fonts";
import { CartolaSection } from "./sections/CartolaSection";
import { PendingInvoicesSection } from "./sections/PendingInvoicesSection";
import { SalesSection } from "./sections/SalesSection";
import { PaymentsSection } from "./sections/PaymentsSection";
import { CreditNotesSection } from "./sections/CreditNotesSection";
import { BalancesSection } from "./sections/BalancesSection";
import { formatDate } from "../utils/formatters";
import type {
  CartolaRow,
  PendingInvoiceRow,
  SaleRow,
  PaymentRow,
  CreditNoteRow,
  BalanceRow,
  ReportType,
} from "../types/report";

registerPdfFonts();

const TAB_LABELS: Record<ReportType, string> = {
  cartola: "Cartola Clientes",
  "pending-invoices": "Facturas Pendientes",
  sales: "Ventas",
  payments: "Pagos",
  "credit-notes": "Notas Crédito",
  balances: "Saldos",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: "#111",
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  filtersBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111",
    paddingVertical: 8,
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  filterLine: { fontSize: 10, marginBottom: 2 },
  filterLabel: { color: "#555", marginRight: 4 },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#555",
  },
});

type Props = {
  type: ReportType;
  filters: { clientId?: string; from?: string; to?: string };
  rows: unknown[];
  totals?: Record<string, number>;
  clientName: string | null;
};

export function ReportsPdf({ type, filters, rows, totals, clientName }: Props) {
  return (
    <Document
      title={`Reporte ${TAB_LABELS[type]}`}
      author="Metalu"
      subject={TAB_LABELS[type]}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte: {TAB_LABELS[type]}</Text>

        <View style={styles.filtersBox}>
          <Text style={styles.filtersTitle}>Filtros aplicados:</Text>
          {filters.clientId && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Cliente:</Text>
              {clientName ?? filters.clientId}
            </Text>
          )}
          {filters.from && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Desde:</Text>
              {formatDate(filters.from)}
            </Text>
          )}
          {filters.to && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Hasta:</Text>
              {formatDate(filters.to)}
            </Text>
          )}
          {!filters.clientId && !filters.from && !filters.to && (
            <Text style={styles.filterLine}>Sin filtros</Text>
          )}
        </View>

        {renderSection(type, rows, totals)}

        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Página ${pageNumber} de ${totalPages}` : null
          }
        />
      </Page>
    </Document>
  );
}

function renderSection(
  type: ReportType,
  rows: unknown[],
  totals?: Record<string, number>
) {
  switch (type) {
    case "cartola":
      return (
        <CartolaSection
          rows={rows as CartolaRow[]}
          totals={totals as any}
        />
      );
    case "pending-invoices":
      return (
        <PendingInvoicesSection
          rows={rows as PendingInvoiceRow[]}
          totals={totals as any}
        />
      );
    case "sales":
      return (
        <SalesSection rows={rows as SaleRow[]} totals={totals as any} />
      );
    case "payments":
      return (
        <PaymentsSection
          rows={rows as PaymentRow[]}
          totals={totals as any}
        />
      );
    case "credit-notes":
      return (
        <CreditNotesSection
          rows={rows as CreditNoteRow[]}
          totals={totals as any}
        />
      );
    case "balances":
      return (
        <BalancesSection
          rows={rows as BalanceRow[]}
          totals={totals as any}
        />
      );
  }
}

export default ReportsPdf;
