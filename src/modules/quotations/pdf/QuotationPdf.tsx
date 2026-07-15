import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/config/company";

// Layout mirrors WorkOrderPdf (Solicitud OT maqueta) — same sections, same
// borders, same column widths. Only the data source changes.
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

type DecimalLike = { toNumber: () => number };

function toNum(v: number | string | DecimalLike | null | undefined): number {
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

type Item = {
  id: string;
  description: string;
  quantity: number | string | DecimalLike;
  unitPrice: number | string | DecimalLike;
  total: number | string | DecimalLike;
  type: "MATERIAL" | "WORK";
};

type Props = {
  quotation: {
    id: string;
    number: string;
    descripcionTrabajo?: string | null;
    plazoEntrega?: string | null;
    atencion?: string | null;
    area?: string | null;
    client: {
      id: string;
      name: string;
      code: string;
      address?: string | null;
      city?: string | null;
    };
    createdBy?: { id: string; name: string | null; phone?: string | null } | null;
    items: Item[];
    subtotal: number | string | DecimalLike;
    tax: number | string | DecimalLike;
    total: number | string | DecimalLike;
    discount?: number | string | DecimalLike | null;
    discountType?: "NONE" | "AMOUNT" | "PERCENT" | null;
    createdAt: Date | string;
    validUntil: Date | string;
    [k: string]: unknown;
  };
  /** Data-URI logo (resolved in the route via getLogoDataUri). Null if logo file missing. */
  logoSrc?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 4,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: "#111",
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 6,
    marginBottom: 2,
  },
  headerCenter: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 6,
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
  descripcionBox: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#111",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
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
});

export function QuotationPdf({ quotation, logoSrc }: Props) {
  const items = quotation.items ?? [];
  const materials = items.filter((i) => i.type === "MATERIAL");
  const works = items.filter((i) => i.type === "WORK");
  const materialsTotal = materials.reduce((acc, i) => acc + toNum(i.total), 0);
  const worksTotal = works.reduce((acc, i) => acc + toNum(i.total), 0);

  const subtotal = toNum(quotation.subtotal);
  const tax = toNum(quotation.tax);
  const total = toNum(quotation.total);
  const discount = toNum(quotation.discount ?? 0);
  const discountType = quotation.discountType ?? "NONE";

  let discountAmount = 0;
  let discountPercent = 0;
  if (discountType === "PERCENT") {
    discountPercent = discount;
    discountAmount = Math.round((subtotal * discount) / 100);
  } else if (discountType === "AMOUNT") {
    discountAmount = discount;
    discountPercent = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
  }
  const neto = Math.max(subtotal - discountAmount, 0);

  const cliente = quotation.client;
  const clienteName = cliente?.name ?? "—";
  const rut = cliente?.code ?? "";
  const direccion = cliente?.address ?? "—";
  const ciudad = cliente?.city ?? "—";

  return (
    <Document
      title={`Cotizacion ${quotation.number}`}
      author={COMPANY.name}
      subject={`Cotizacion ${quotation.number}`}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER — logo top-left, company info centered below */}
        {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <View style={styles.logo} />}
        <View style={styles.headerCenter}>
          <Text style={styles.title}>COTIZACION N°{quotation.number}</Text>
          <Text style={styles.companyName}>{COMPANY.name}</Text>
          <Text style={styles.companyLine}>RUT {COMPANY.rut}</Text>
          <Text style={styles.companyLine}>
            {COMPANY.address}  *  {COMPANY.neighborhood}
          </Text>
          <Text style={styles.companyLine}>
            FONO/FAX {COMPANY.phone}  *  {COMPANY.city}
          </Text>
          <Text style={styles.companyMail}>MAIL: {COMPANY.email}</Text>
        </View>

        {/* CLIENT INFO BOX — 2-column grid with row dividers */}
        <View style={styles.box}>
          {[
            ["Cliente", clienteName, "Fecha", formatDate(quotation.createdAt)],
            ["Rut", rut || "—", "Ciudad", ciudad || "—"],
            [
              "Direccion",
              direccion,
              "Plazo Entrega",
              quotation.plazoEntrega || "—",
            ],
            [
              "Atencion",
              quotation.atencion || "—",
              "Validez Oferta",
              formatDate(quotation.validUntil),
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

        {/* DESCRIPCIÓN BOX — Área + Descripción */}
        <View style={styles.descripcionBox}>
          <View style={styles.boxFieldRow}>
            <View style={[styles.cell, styles.cellLabel]}>
              <Text style={styles.cellLabelText}>Área:</Text>
            </View>
            <View style={[styles.cell, { width: "78%" }]}>
              <Text style={styles.cellValueText}>
                {quotation.area || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.boxFieldRowLast}>
            <View style={[styles.cell, styles.cellLabel]}>
              <Text style={styles.cellLabelText}>Descripción:</Text>
            </View>
            <View style={[styles.cell, { width: "78%" }]}>
              <Text style={styles.cellValueText}>
                {quotation.descripcionTrabajo || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* I. DETALLE DE MATERIALES */}
        <Text style={styles.sectionTitle}>I. DETALLE DE MATERIALES</Text>
        <View style={styles.table}>
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
          {materials.length === 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.tCell, { width: "100%" }]}>—</Text>
            </View>
          ) : (
            materials.map((it, idx) => (
              <View style={styles.tRow} key={it.id ?? idx}>
                <Text style={[styles.tCell, styles.cItem]}>{formatQuantity(toNum(it.quantity))}</Text>
                <Text style={[styles.tCell, styles.cDet]}>{it.description}</Text>
                <Text style={[styles.tCell, styles.cPrice, { textAlign: "right" }]}>
                  {formatCLP(toNum(it.unitPrice))}
                </Text>
                <Text style={[styles.tCell, styles.cTotal, styles.tCellLast, { textAlign: "right" }]}>
                  {formatCLP(toNum(it.total))}
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700, marginRight: 8 }}>
              Total {materials.length}
            </Text>
            <Text style={{ fontWeight: 700 }}>{formatCLP(materialsTotal)}</Text>
          </View>
        </View>

        {/* II. DETALLE DE TRABAJOS REALIZADOS */}
        <Text style={styles.sectionTitle}>II. DETALLE DE TRABAJOS REALIZADOS</Text>
        <View style={styles.table}>
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
          {works.length === 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.tCell, { width: "100%" }]}>—</Text>
            </View>
          ) : (
            works.map((it, idx) => (
              <View style={styles.tRow} key={it.id ?? idx}>
                <Text style={[styles.tCell, styles.cItem]}>{formatQuantity(toNum(it.quantity))}</Text>
                <Text style={[styles.tCell, styles.cDet]}>{it.description}</Text>
                <Text style={[styles.tCell, styles.cPrice, { textAlign: "right" }]}>
                  {formatCLP(toNum(it.unitPrice))}
                </Text>
                <Text style={[styles.tCell, styles.cTotal, styles.tCellLast, { textAlign: "right" }]}>
                  {formatCLP(toNum(it.total))}
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700, marginRight: 8 }}>
              Total {works.length}
            </Text>
            <Text style={{ fontWeight: 700 }}>{formatCLP(worksTotal)}</Text>
          </View>
        </View>

        {/* FOOTER — creator (left) + totals (right) */}
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Text style={styles.usuarioLine}>
              Usuario: {quotation.createdBy?.name ?? "—"}
            </Text>
            {quotation.createdBy?.phone ? (
              <Text style={styles.usuarioLine}>
                Teléfono: {quotation.createdBy.phone}
              </Text>
            ) : null}
          </View>
          <View style={styles.footerRight}>
            <View style={styles.resumenLine}>
              <Text>Sub-Total Neto:</Text>
              <Text>{formatCLP(subtotal)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.resumenLine}>
                <Text>
                  (-) Descuento{discountType === "PERCENT" ? ` ${discountPercent}%` : ""}:
                </Text>
                <Text>{formatCLP(discountAmount)}</Text>
              </View>
            )}
            <View style={styles.resumenLine}>
              <Text>Neto:</Text>
              <Text>{formatCLP(neto)}</Text>
            </View>
            <View style={styles.resumenLine}>
              <Text>Iva:</Text>
              <Text>{formatCLP(tax)}</Text>
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
      </Page>
    </Document>
  );
}

export default QuotationPdf;