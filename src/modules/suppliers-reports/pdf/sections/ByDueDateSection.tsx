// src/modules/suppliers-reports/pdf/sections/ByDueDateSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "@/modules/reports/pdf/PdfTable";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from "@/modules/suppliers/types/supplierDocument";
import type { SupplierDocByDueDateRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: SupplierDocByDueDateRow[];
  totals?: { total: number };
};

const columns: PdfColumn<SupplierDocByDueDateRow>[] = [
  {
    header: "Vencimiento",
    render: (r) => formatDate(r.fechaVencimiento),
    width: "12%",
  },
  {
    header: "Proveedor",
    render: (r) => `${r.supplierCode} · ${r.supplierName}`,
    width: "26%",
  },
  {
    header: "Tipo",
    render: (r) => SUPPLIER_DOCUMENT_TYPE_LABELS[r.tipoDocumento] ?? r.tipoDocumento,
    width: "12%",
  },
  { header: "Nombre", accessor: "nombre", width: "20%" },
  { header: "N° Doc", accessor: "documento", width: "14%" },
  {
    header: "Valor",
    render: (r) => formatCLP(r.valor),
    width: "16%",
    align: "right",
  },
];

export function ByDueDateSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Valor: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}