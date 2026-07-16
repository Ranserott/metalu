// src/modules/suppliers-reports/pdf/sections/DailySummarySection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "@/modules/reports/pdf/PdfTable";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import type { DailySummaryRow, DailySummaryTotals } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
    flexWrap: "wrap",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: DailySummaryRow[];
  totals?: DailySummaryTotals;
};

const columns: PdfColumn<DailySummaryRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.fecha), width: "14%" },
  {
    header: "Pendiente",
    render: (r) => `${r.pendiente.count} · ${formatCLP(r.pendiente.total)}`,
    width: "22%",
    align: "right",
  },
  {
    header: "Pagado",
    render: (r) => `${r.pagado.count} · ${formatCLP(r.pagado.total)}`,
    width: "22%",
    align: "right",
  },
  {
    header: "Cancelado",
    render: (r) => `${r.cancelado.count} · ${formatCLP(r.cancelado.total)}`,
    width: "22%",
    align: "right",
  },
  {
    header: "Total del día",
    render: (r) => formatCLP(r.totalDelDia),
    width: "20%",
    align: "right",
  },
];

export function DailySummarySection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Pendiente: </Text>
            <Text style={styles.totalsValue}>
              {totals.pendiente.count} · {formatCLP(totals.pendiente.total)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Pagado: </Text>
            <Text style={styles.totalsValue}>
              {totals.pagado.count} · {formatCLP(totals.pagado.total)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Cancelado: </Text>
            <Text style={styles.totalsValue}>
              {totals.cancelado.count} · {formatCLP(totals.cancelado.total)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Total: </Text>
            <Text style={styles.totalsValue}>
              {totals.count} · {formatCLP(totals.total)}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}