import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/config/company";

// Monospace "Courier" is a built-in PDF font in @react-pdf/renderer — no
// registration needed. Matches the maqueta layout (Solicitud OT.pdf).
const MONO_FONT = "Courier";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatCLP(n: number): string {
  return clp.format(Number.isFinite(n) ? n : 0);
}

function formatQuantity(n: number): string {
  const num = Number.isFinite(n) ? n : 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toNum(v: number | string | { toNumber: () => number } | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof (v as any).toNumber === "function") {
    try {
      return (v as any).toNumber();
    } catch {
      return 0;
    }
  }
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

type Material = {
  id: string;
  material: string;
  quantity: number | string | { toNumber: () => number };
  unit?: string | null;
  unitPrice?: number | string | { toNumber: () => number } | null;
  total?: number | string | { toNumber: () => number } | null;
};

// Use a structural type that matches the Prisma return shape so callers don't
// need to coerce Decimal -> number. We accept any for monetary fields and
// coerce internally via toNum().
type Props = {
  workOrder: {
    id: string;
    number: string;
    title: string;
    description?: string | null;
    status: string;
    client?: {
      id: string;
      name: string;
      code?: string | null;
      address?: string | null;
      city?: string | null;
    } | null;
    rut?: string | null;
    razonSocial?: string | null;
    entregadoPor?: string | null;
    celular?: string | null;
    fechaTrabajo?: Date | string | null;
    createdAt: Date | string;
    local?: string | null;
    condicionesPago?: string | null;
    plazoDias?: number | null;
    neto?: number | string | { toNumber: () => number } | null;
    descuentoPorcentaje?: number | string | { toNumber: () => number } | null;
    subtotalAfecto?: number | string | { toNumber: () => number } | null;
    iva?: number | string | { toNumber: () => number } | null;
    total?: number | string | { toNumber: () => number } | null;
    materials?: Material[];
    [k: string]: any;
  };
  users?: Array<{ id: string; name: string | null }>;
  /** Data-URI logo (resolved in the route via getLogoDataUri). Null if logo file missing. */
  logoSrc?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  logo: {
    width: 70,
    height: 70,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    maxWidth: 360,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
    fontFamily: MONO_FONT,
  },
  companyName: {
    fontWeight: 700,
    fontSize: 11,
  },
  companyLine: {
    fontSize: 10,
  },
  companyMail: {
    fontWeight: 700,
    fontSize: 10,
  },
  box: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#111",
    marginBottom: 6,
  },
  boxHeaderRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderColor: "#111",
  },
  boxFieldRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#111",
    minHeight: 14,
  },
  boxFieldRowLast: {
    flexDirection: "row",
    borderBottomWidth: 0,
    minHeight: 14,
  },
  cell: {
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  cellLabel: { width: "22%" },
  cellValue: { width: "28%" },
  cellLabelText: {
    fontSize: 10,
    fontWeight: 700,
  },
  cellValueText: {
    fontSize: 10,
  },
  entregadoBox: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#111",
    marginBottom: 8,
  },
  sectionBar: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
  },
  sectionBarText: {
    fontSize: 10,
    fontWeight: 700,
  },
  table: {
    borderTop: 1,
    borderLeft: 1,
    borderRight: 1,
    borderColor: "#111",
  },
  tRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderColor: "#111",
    minHeight: 18,
  },
  tableHeaderRow: {
    backgroundColor: "#e8e8e8",
  },
  tableHeaderCell: {
    fontWeight: 700,
    fontSize: 10,
  },
  tCell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 10,
    borderRight: 1,
    borderColor: "#111",
  },
  tCellLast: {
    borderRight: 0,
  },
  cItem: { width: "8%" },
  cDet: { width: "64%" },
  cPrice: { width: "14%" },
  cTotal: { width: "14%" },
  totalRow: {
    flexDirection: "row",
    borderTop: 1,
    borderColor: "#111",
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: "flex-end",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  footerLeft: {
    width: "55%",
    paddingRight: 8,
  },
  footerRight: {
    width: "40%",
  },
  usuarioLine: {
    fontSize: 10,
    marginBottom: 1,
  },
  resumenLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 10,
  },
  resumenTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: 700,
    borderTop: 1,
    borderColor: "#111",
    marginTop: 2,
  },
  firmaContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  firmaLine: {
    borderTop: 1,
    borderColor: "#111",
    width: 220,
    marginBottom: 4,
  },
  firmaText: {
    fontStyle: "italic",
    fontSize: 10,
    textAlign: "center",
  },
  disclaimer: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
  },
});

export function WorkOrderPdf({ workOrder, users = [], logoSrc }: Props) {
  const items = workOrder.materials ?? [];
  const itemsTotal = items.reduce((acc, i) => acc + toNum(i.total), 0);

  const neto = toNum(workOrder.neto);
  const descuentoPct = toNum(workOrder.descuentoPorcentaje);
  const descuentoAmount =
    descuentoPct > 0 ? Math.round((neto * descuentoPct) / 100) : 0;
  const subtotalAfecto = toNum(workOrder.subtotalAfecto);
  const iva = toNum(workOrder.iva);
  const total = toNum(workOrder.total);

  const fecha =
    workOrder.fechaTrabajo ?? workOrder.createdAt ?? null;

  const cliente = workOrder.client;
  const clienteName =
    cliente?.name ?? workOrder.razonSocial ?? "—";
  const rut = workOrder.rut ?? cliente?.code ?? "";
  const direccion = cliente?.address ?? "—";
  const ciudad = workOrder.local ?? cliente?.city ?? "";

  return (
    <Document
      title={`Trabajo ${workOrder.number}`}
      author={COMPANY.name}
      subject={`Trabajo ${workOrder.number}`}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <View style={styles.logo} />}
          <View style={styles.headerRight}>
            <Text style={styles.title}>TRABAJO N°{workOrder.number}</Text>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            <Text style={styles.companyLine}>
              {COMPANY.address}  *  {COMPANY.neighborhood}
            </Text>
            <Text style={styles.companyLine}>
              FONO/FAX {COMPANY.phone}  *  {COMPANY.city}
            </Text>
            <Text style={styles.companyLine}>RUT {COMPANY.rut}</Text>
            <Text style={styles.companyMail}>MAIL: {COMPANY.email}</Text>
          </View>
        </View>

        {/* CLIENT INFO BOX — 2-column grid with row dividers */}
        <View style={styles.box}>
          {[
            ["Cliente", clienteName, "Fecha", formatDate(fecha)],
            [
              "Rut",
              rut || "—",
              "Ciudad",
              ciudad || "—",
            ],
            [
              "Direccion",
              direccion,
              "Condiciones Pago",
              workOrder.condicionesPago || "—",
            ],
            [
              "Celular",
              workOrder.celular || "—",
              "Plazo Entrega",
              workOrder.plazoDias != null ? `${workOrder.plazoDias} días` : "—",
            ],
          ].map(([lblL, valL, lblR, valR], idx, arr) => (
            <View
              key={idx}
              style={
                idx === arr.length - 1
                  ? styles.boxFieldRowLast
                  : styles.boxFieldRow
              }
            >
              <View style={[styles.cell, styles.cellLabel]}>
                <Text style={styles.cellLabelText}>{lblL}</Text>
              </View>
              <View style={[styles.cell, styles.cellValue]}>
                <Text style={styles.cellValueText}>{valL}</Text>
              </View>
              <View style={[styles.cell, styles.cellLabel]}>
                <Text style={styles.cellLabelText}>{lblR}</Text>
              </View>
              <View style={[styles.cell, styles.cellValue]}>
                <Text style={styles.cellValueText}>{valR}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ENTREGADO POR BOX */}
        <View style={styles.entregadoBox}>
          <View style={styles.boxFieldRow}>
            <View style={[styles.cell, styles.cellLabel]}>
              <Text style={styles.cellLabelText}>Entregado por:</Text>
            </View>
            <View style={[styles.cell, { width: "78%" }]}>
              <Text style={styles.cellValueText}>
                {workOrder.entregadoPor || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          {/* Header row — aligned with column widths */}
          <View style={[styles.tRow, styles.tableHeaderRow]}>
            <Text style={[styles.tCell, styles.cItem, styles.tableHeaderCell]}>CANT</Text>
            <Text style={[styles.tCell, styles.cDet, styles.tableHeaderCell]}>DETALLE</Text>
            <Text style={[styles.tCell, styles.cPrice, styles.tableHeaderCell, { textAlign: "right" }]}>
              P. UNITARIO
            </Text>
            <Text style={[styles.tCell, styles.cTotal, styles.tCellLast, styles.tableHeaderCell, { textAlign: "right" }]}>
              TOTAL
            </Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.tCell, { width: "100%" }]}>—</Text>
            </View>
          ) : (
            items.map((it, idx) => (
              <View style={styles.tRow} key={it.id ?? idx}>
                <Text style={[styles.tCell, styles.cItem]}>{formatQuantity(toNum(it.quantity))}</Text>
                <Text style={[styles.tCell, styles.cDet]}>{it.material}</Text>
                <Text style={[styles.tCell, styles.cPrice]}>
                  {formatCLP(toNum(it.unitPrice))}
                </Text>
                <Text style={[styles.tCell, styles.cTotal, styles.tCellLast]}>
                  {formatCLP(toNum(it.total))}
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700, marginRight: 8 }}>
              Total {items.length}
            </Text>
            <Text style={{ fontWeight: 700 }}>{formatCLP(itemsTotal)}</Text>
          </View>
        </View>

        {/* FOOTER — users (left) + totals (right) */}
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            {users.length === 0 ? (
              <Text style={styles.usuarioLine}>Usuarios: —</Text>
            ) : (
              users.map((u) => (
                <Text style={styles.usuarioLine} key={u.id}>
                  Usuario: {u.name ?? "—"}
                </Text>
              ))
            )}
          </View>
          <View style={styles.footerRight}>
            <View style={styles.resumenLine}>
              <Text>Sub-Total Neto:</Text>
              <Text>{formatCLP(neto)}</Text>
            </View>
            {descuentoPct > 0 && (
              <View style={styles.resumenLine}>
                <Text>(-) Descuento {descuentoPct}%:</Text>
                <Text>{formatCLP(descuentoAmount)}</Text>
              </View>
            )}
            <View style={styles.resumenLine}>
              <Text>Neto:</Text>
              <Text>{formatCLP(subtotalAfecto)}</Text>
            </View>
            <View style={styles.resumenLine}>
              <Text>Iva:</Text>
              <Text>{formatCLP(iva)}</Text>
            </View>
            <View style={styles.resumenTotal}>
              <Text>Total:</Text>
              <Text>{formatCLP(total)}</Text>
            </View>
          </View>
        </View>

        {/* SIGNATURE */}
        <View style={styles.firmaContainer}>
          <View style={styles.firmaLine} />
          <Text style={styles.firmaText}>Firma Cliente</Text>
        </View>

        {/* DISCLAIMER */}
        <Text style={styles.disclaimer}>
          NO SE RESPONDE POR TRABAJOS DEJADOS MAS DE 45 DIAS EN EL TALLER
        </Text>
      </Page>
    </Document>
  );
}

export default WorkOrderPdf;