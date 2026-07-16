// src/modules/reports/pdf/sections/CreditNotesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { CreditNoteRow } from "../../types/report";

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
  rows: CreditNoteRow[];
  totals?: { total: number };
};

const columns: PdfColumn<CreditNoteRow>[] = [
  {
    header: "Fecha",
    render: (r) => formatDate(r.issueDate),
    width: "14%",
  },
  { header: "N°", accessor: "number", width: "16%" },
  { header: "Cliente", accessor: "clientName", width: "42%" },
  {
    header: "Total",
    render: (r) => formatCLP(r.total),
    width: "28%",
    align: "right",
  },
];

export function CreditNotesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Total: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}