// src/modules/reports/pdf/sections/BalancesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP } from "../../utils/formatters";
import type { BalanceRow } from "../../types/report";

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
  rows: BalanceRow[];
  totals?: { saldoActual: number };
};

const columns: PdfColumn<BalanceRow>[] = [
  { header: "Código", accessor: "clientCode", width: "14%" },
  { header: "Cliente", accessor: "clientName", width: "30%" },
  {
    header: "Facturado",
    render: (r) => formatCLP(r.totalFacturado),
    width: "14%",
    align: "right",
  },
  {
    header: "Pagado",
    render: (r) => formatCLP(r.totalPagado),
    width: "14%",
    align: "right",
  },
  {
    header: "Notas Crédito",
    render: (r) => formatCLP(r.totalNotasCredito),
    width: "14%",
    align: "right",
  },
  {
    header: "Saldo Actual",
    render: (r) => formatCLP(r.saldoActual),
    width: "14%",
    align: "right",
  },
];

export function BalancesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Saldo Actual: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.saldoActual)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}