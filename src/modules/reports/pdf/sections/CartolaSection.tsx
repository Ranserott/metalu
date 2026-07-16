// src/modules/reports/pdf/sections/CartolaSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { CartolaRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsItem: { fontSize: 10 },
  totalsLabel: { color: "#555" },
  totalsValue: { fontWeight: 700 },
});

type Props = {
  rows: CartolaRow[];
  totals?: { cargos: number; abonos: number; saldoFinal: number };
};

const columns: PdfColumn<CartolaRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.date), width: "12%" },
  { header: "Tipo", accessor: "type", width: "12%" },
  { header: "N° Doc", accessor: "documentNumber", width: "14%" },
  { header: "Detalle", accessor: "detail", width: "30%" },
  {
    header: "Cargo",
    render: (r) => (r.charge ? formatCLP(r.charge) : "—"),
    width: "10%",
    align: "right",
  },
  {
    header: "Abono",
    render: (r) => (r.payment ? formatCLP(r.payment) : "—"),
    width: "10%",
    align: "right",
  },
  {
    header: "Saldo",
    render: (r) => formatCLP(r.balance),
    width: "12%",
    align: "right",
  },
];

export function CartolaSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text style={styles.totalsItem}>
            <Text style={styles.totalsLabel}>Σ Cargos: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.cargos)}</Text>
          </Text>
          <Text style={styles.totalsItem}>
            <Text style={styles.totalsLabel}>Σ Abonos: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.abonos)}</Text>
          </Text>
          <Text style={styles.totalsItem}>
            <Text style={styles.totalsLabel}>Saldo Final: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.saldoFinal)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}