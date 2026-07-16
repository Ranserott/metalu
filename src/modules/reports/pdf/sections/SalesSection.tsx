// src/modules/reports/pdf/sections/SalesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { SaleRow } from "../../types/report";

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
  rows: SaleRow[];
  totals?: { neto: number; iva: number; total: number };
};

const columns: PdfColumn<SaleRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.issueDate), width: "12%" },
  { header: "N°", accessor: "number", width: "12%" },
  { header: "Cliente", accessor: "clientName", width: "32%" },
  {
    header: "Neto",
    render: (r) => formatCLP(r.neto),
    width: "14%",
    align: "right",
  },
  {
    header: "IVA",
    render: (r) => formatCLP(r.iva),
    width: "14%",
    align: "right",
  },
  {
    header: "Total",
    render: (r) => formatCLP(r.total),
    width: "16%",
    align: "right",
  },
];

export function SalesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Neto: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.neto)}</Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ IVA: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.iva)}</Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Total: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}