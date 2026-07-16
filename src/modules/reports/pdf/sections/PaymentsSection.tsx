// src/modules/reports/pdf/sections/PaymentsSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { PaymentRow } from "../../types/report";

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
  rows: PaymentRow[];
  totals?: { monto: number };
};

const columns: PdfColumn<PaymentRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.date), width: "12%" },
  { header: "N°", accessor: "number", width: "12%" },
  {
    header: "Cliente",
    render: (r) => r.clientName ?? "—",
    width: "32%",
  },
  { header: "Método", accessor: "method", width: "16%" },
  {
    header: "Monto",
    render: (r) => formatCLP(r.amount),
    width: "14%",
    align: "right",
  },
  { header: "Estado", accessor: "status", width: "14%" },
];

export function PaymentsSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Monto: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.monto)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}