// src/modules/suppliers-reports/pdf/sections/BySupplierSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "@/modules/reports/pdf/PdfTable";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from "@/modules/suppliers/types/supplierDocument";
import type { SupplierDocBySupplierRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
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
  rows: SupplierDocBySupplierRow[];
  totals?: { total: number; count: number };
};

const columns: PdfColumn<SupplierDocBySupplierRow>[] = [
  {
    header: "Proveedor",
    render: (r) => `${r.supplierCode} · ${r.supplierName}`,
    width: "28%",
  },
  {
    header: "Vencimiento",
    render: (r) => formatDate(r.fechaVencimiento),
    width: "14%",
  },
  {
    header: "Tipo",
    render: (r) => SUPPLIER_DOCUMENT_TYPE_LABELS[r.tipoDocumento] ?? r.tipoDocumento,
    width: "14%",
  },
  { header: "N° Doc", accessor: "documento", width: "16%" },
  {
    header: "Valor",
    render: (r) => formatCLP(r.valor),
    width: "28%",
    align: "right",
  },
];

export function BySupplierSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Documentos: </Text>
            <Text style={styles.totalsValue}>{totals.count}</Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Valor: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}