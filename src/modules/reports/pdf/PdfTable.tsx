// src/modules/reports/pdf/PdfTable.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";

export type PdfColumn<T> = {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => string;
  width: string; // CSS width, e.g. "12%"
  align?: "left" | "right" | "center";
};

type Props<T> = {
  columns: PdfColumn<T>[];
  rows: T[];
};

const styles = StyleSheet.create({
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#111",
    marginTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    borderBottomWidth: 1,
    borderColor: "#111",
  },
  headerCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 10,
    fontWeight: 700,
    borderRightWidth: 1,
    borderColor: "#111",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#111",
    minHeight: 16,
  },
  cell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 10,
    borderRightWidth: 1,
    borderColor: "#111",
  },
  cellLast: {
    borderRightWidth: 0,
  },
});

export function PdfTable<T>({ columns, rows }: Props<T>) {
  function renderCell(row: T, col: PdfColumn<T>) {
    const value = col.render
      ? col.render(row)
      : col.accessor
        ? String((row as any)[col.accessor] ?? "")
        : "";
    return (
      <Text
        key={`${col.header}-${value}`}
        style={[
          styles.cell,
          { width: col.width, textAlign: col.align ?? "left" },
        ]}
      >
        {value}
      </Text>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.table}>
        <View style={styles.headerRow}>
          {columns.map((c, i) => (
            <Text
              key={c.header}
              style={[
                styles.headerCell,
                { width: c.width, textAlign: c.align ?? "left" },
                i === columns.length - 1 ? styles.cellLast : {},
              ]}
            >
              {c.header}
            </Text>
          ))}
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, { width: "100%", textAlign: "center" }]}>
            Sin resultados para los filtros aplicados
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        {columns.map((c, i) => (
          <Text
            key={c.header}
            style={[
              styles.headerCell,
              { width: c.width, textAlign: c.align ?? "left" },
              i === columns.length - 1 ? styles.cellLast : {},
            ]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.row}>
          {columns.map((c) => (
            <View key={c.header} style={{ width: c.width }}>
              {renderCell(row, c)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
