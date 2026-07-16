// src/modules/suppliers-reports/pdf/SupplierReportsPdf.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_FONT_FAMILY } from "@/lib/pdf/fonts";
import { ByDueDateSection } from "./sections/ByDueDateSection";
import { BySupplierSection } from "./sections/BySupplierSection";
import { DailySummarySection } from "./sections/DailySummarySection";
import { formatDate } from "@/modules/reports/utils/formatters";
import type {
  SupplierReportType,
  SupplierDocByDueDateRow,
  SupplierDocBySupplierRow,
  DailySummaryRow,
} from "../types/report";

registerPdfFonts();

const TAB_LABELS: Record<SupplierReportType, string> = {
  "by-due-date": "Por pagar x fecha",
  "by-supplier": "Por pagar x proveedor",
  "daily-summary": "Resumen x día",
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
  filtersTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
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
  type: SupplierReportType;
  filters: { supplierId?: string; from?: string; to?: string };
  rows: unknown[];
  totals?: Record<string, number>;
  supplierName: string | null;
};

export function SupplierReportsPdf({
  type,
  filters,
  rows,
  totals,
  supplierName,
}: Props) {
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
          {filters.supplierId && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Proveedor:</Text>
              {supplierName ?? filters.supplierId}
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
          {!filters.supplierId && !filters.from && !filters.to && (
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
  type: SupplierReportType,
  rows: unknown[],
  totals?: Record<string, number>
) {
  switch (type) {
    case "by-due-date":
      return (
        <ByDueDateSection
          rows={rows as SupplierDocByDueDateRow[]}
          totals={totals as any}
        />
      );
    case "by-supplier":
      return (
        <BySupplierSection
          rows={rows as SupplierDocBySupplierRow[]}
          totals={totals as any}
        />
      );
    case "daily-summary":
      return (
        <DailySummarySection
          rows={rows as DailySummaryRow[]}
          totals={totals as any}
        />
      );
  }
}

export default SupplierReportsPdf;
