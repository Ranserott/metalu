// src/modules/reports/pdf/sections/PendingInvoicesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { PendingInvoiceRow } from "../../types/report";

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
  rows: PendingInvoiceRow[];
  totals?: { saldo: number };
};

const columns: PdfColumn<PendingInvoiceRow>[] = [
  {
    header: "Emisión",
    render: (r) => formatDate(r.issueDate),
    width: "12%",
  },
  { header: "Vencimiento", render: (r) => formatDate(r.dueDate), width: "12%" },
  { header: "N°", accessor: "number", width: "12%" },
  { header: "Cliente", accessor: "clientName", width: "26%" },
  {
    header: "Total",
    render: (r) => formatCLP(r.total),
    width: "12%",
    align: "right",
  },
  {
    header: "Saldo",
    render: (r) => formatCLP(r.saldo),
    width: "12%",
    align: "right",
  },
  {
    header: "Días atraso",
    render: (r) => (r.daysOverdue == null ? "—" : String(r.daysOverdue)),
    width: "14%",
    align: "right",
  },
];

export function PendingInvoicesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Saldo: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.saldo)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}