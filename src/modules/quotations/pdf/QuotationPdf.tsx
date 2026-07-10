import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/config/company";
import { registerPdfFonts, PDF_FONT_FAMILY } from "@/lib/pdf/fonts";

registerPdfFonts();

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatCLP(n: number): string {
  return clp.format(Number.isFinite(n) ? n : 0);
}

function formatDate(d: Date | string): string {
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

type Item = {
  id: string;
  description: string;
  quantity: number | string | { toNumber: () => number };
  unitPrice: number | string | { toNumber: () => number };
  total: number | string | { toNumber: () => number };
  type: "MATERIAL" | "WORK";
};

// Use a structural type that matches the Prisma return shape so callers don't
// need to coerce Decimal -> number. We accept any for monetary fields and
// coerce internally via toNum().
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
    createdBy?: { id: string; name: string | null } | null;
    items: Item[];
    subtotal: number | string | { toNumber: () => number };
    tax: number | string | { toNumber: () => number };
    total: number | string | { toNumber: () => number };
    discount?: number | string | { toNumber: () => number } | null;
    discountType?: "NONE" | "AMOUNT" | "PERCENT" | null;
    createdAt: Date | string;
    validUntil: Date | string;
    [k: string]: any;
  };
  /** Data-URI logo (resolved in the route via getLogoDataUri). Null if logo file missing. */
  logoSrc?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: PDF_FONT_FAMILY,
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
    // BOTH width and height must be set: @react-pdf/renderer reads the SVG's
    // intrinsic dimensions (512x512 in this file) when height is missing,
    // which renders the logo at full size regardless of `width`.
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
    fontFamily: PDF_FONT_FAMILY,
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
  clientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  clientBlock: {
    flexDirection: "column",
  },
  clientLine: {
    fontSize: 10,
    marginBottom: 1,
  },
  fecha: {
    fontSize: 10,
    alignSelf: "flex-start",
  },
  descripcionLine: {
    fontSize: 10,
    marginBottom: 8,
  },
  sectionBar: {
    backgroundColor: "#e6e6e6",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 6,
    marginBottom: 0,
  },
  sectionBarText: {
    fontSize: 11,
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
  cDesc: { width: "44%" },
  cUnit: { width: "14%" },
  cPrice: { width: "17%" },
  cTotal: { width: "17%" },
  cLabel: { width: "50%" },
  cValue: { width: "50%" },
  totalRow: {
    flexDirection: "row",
    borderTop: 1,
    borderColor: "#111",
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: "flex-end",
  },
  resumenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  resumenTable: {
    width: "55%",
  },
  resumenRight: {
    width: "40%",
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
  footerFixed: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    fontSize: 10,
  },
  footerLeft: {
    flexDirection: "column",
    width: "55%",
  },
  footerRight: {
    width: "40%",
    alignItems: "center",
  },
  firmaLine: {
    borderTop: 1,
    borderColor: "#111",
    width: "100%",
    marginBottom: 4,
  },
  firmaText: {
    fontStyle: "italic",
    fontSize: 10,
    textAlign: "center",
  },
});

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionBar} fixed>
      <Text style={styles.sectionBarText}>{title}</Text>
    </View>
  );
}

function ItemsTable({
  items,
  totalsLabel,
  totalsValue,
}: {
  items: Item[];
  totalsLabel: string;
  totalsValue: number;
}) {
  return (
    <View>
      <SectionHeader title="Item | Descripcion | Unidad | P.Unitario | Total" />
      <View style={styles.table}>
        <View style={styles.tRow}>
          <Text style={[styles.tCell, styles.cItem]}></Text>
          <Text style={[styles.tCell, styles.cDesc]}></Text>
          <Text style={[styles.tCell, styles.cUnit]}></Text>
          <Text style={[styles.tCell, styles.cPrice]}></Text>
          <Text style={[styles.tCell, styles.cTotal, styles.tCellLast]}></Text>
        </View>
        {items.map((it, idx) => (
          <View style={styles.tRow} key={it.id}>
            <Text style={[styles.tCell, styles.cItem]}>{idx + 1}</Text>
            <Text style={[styles.tCell, styles.cDesc]}>{it.description}</Text>
            <Text style={[styles.tCell, styles.cUnit]}>{toNum(it.quantity)}</Text>
            <Text style={[styles.tCell, styles.cPrice]}>{formatCLP(toNum(it.unitPrice))}</Text>
            <Text style={[styles.tCell, styles.cTotal, styles.tCellLast]}>
              {formatCLP(toNum(it.total))}
            </Text>
          </View>
        ))}
        {items.length === 0 ? (
          <View style={styles.tRow}>
            <Text style={[styles.tCell, { width: "100%" }]}>—</Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={{ fontWeight: 700, marginRight: 8 }}>{totalsLabel}</Text>
          <Text style={{ fontWeight: 700 }}>{formatCLP(totalsValue)}</Text>
        </View>
      </View>
    </View>
  );
}

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

  const cotizo = quotation.createdBy?.name?.trim() || "—";

  return (
    <Document
      title={`Cotizacion ${quotation.number}`}
      author={COMPANY.name}
      subject={`Cotizacion ${quotation.number}`}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <View style={styles.logo} />}
          <View style={styles.headerRight}>
            <Text style={styles.title}>COTIZACION N°{quotation.number}</Text>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            <Text style={styles.companyLine}>{COMPANY.address}</Text>
            <Text style={styles.companyLine}>RUT {COMPANY.rut}</Text>
            <Text style={styles.companyLine}>GIRO: {COMPANY.giro}</Text>
            <Text style={styles.companyLine}>FONO: {COMPANY.phone}</Text>
            <Text style={styles.companyMail}>MAIL: {COMPANY.email}</Text>
          </View>
        </View>

        {/* CLIENT + FECHA */}
        <View style={styles.clientRow}>
          <View style={styles.clientBlock}>
            <Text style={styles.clientLine}>Cliente: {quotation.client?.name ?? "—"}</Text>
            <Text style={styles.clientLine}>Rut: {quotation.client?.code ?? "—"}</Text>
            <Text style={styles.clientLine}>Direccion: {quotation.client?.address ?? "—"}</Text>
            <Text style={styles.clientLine}>Ciudad: {quotation.client?.city ?? ""}</Text>
            <Text style={styles.clientLine}>Atencion: {quotation.atencion || "—"}</Text>
            <Text style={styles.clientLine}>Area: {quotation.area || "—"}</Text>
          </View>
          <View>
            <Text style={styles.fecha}>Fecha: {formatDate(quotation.createdAt)}</Text>
          </View>
        </View>

        {/* DESCRIPCION TRABAJO */}
        <Text style={styles.descripcionLine}>
          Descripcion Trabajo: {quotation.descripcionTrabajo || "—"}
        </Text>

        {/* SECTION I — MATERIALES */}
        {materials.length > 0 && (
          <ItemsTable
            items={materials}
            totalsLabel={`Total ${materials.length}`}
            totalsValue={materialsTotal}
          />
        )}

        {/* SECTION II — TRABAJOS */}
        {works.length > 0 && (
          <ItemsTable
            items={works}
            totalsLabel={`Total ${works.length}`}
            totalsValue={worksTotal}
          />
        )}

        {/* SECTION IV — RESUMEN GENERAL */}
        <View style={{ marginTop: 10 }}>
          <SectionHeader title="IV. RESUMEN GENERAL" />
          <View style={styles.table}>
            <View style={styles.tRow}>
              <Text style={[styles.tCell, styles.cLabel]}>Detalle de Materiales</Text>
              <Text style={[styles.tCell, styles.cValue, styles.tCellLast]}>
                {materialsTotal > 0 ? formatCLP(materialsTotal) : ""}
              </Text>
            </View>
            <View style={styles.tRow}>
              <Text style={[styles.tCell, styles.cLabel]}>Detalle de Trabajos Realizados</Text>
              <Text style={[styles.tCell, styles.cValue, styles.tCellLast]}>
                {worksTotal > 0 ? formatCLP(worksTotal) : ""}
              </Text>
            </View>
            <View style={styles.tRow}>
              <Text style={[styles.tCell, styles.cLabel]}>Mano de Obra</Text>
              <Text style={[styles.tCell, styles.cValue, styles.tCellLast]}></Text>
            </View>
            <View style={styles.tRow}>
              <Text style={[styles.tCell, styles.cLabel]}>G.G. y Utilidades</Text>
              <Text style={[styles.tCell, styles.cValue, styles.tCellLast]}></Text>
            </View>
          </View>
        </View>

        {/* Right-aligned summary block */}
        <View style={styles.resumenRow}>
          <View style={styles.resumenTable}></View>
          <View style={styles.resumenRight}>
            <View style={styles.resumenLine}>
              <Text>Sub-Total Neto:</Text>
              <Text>{formatCLP(subtotal)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.resumenLine}>
                <Text>(-) Descuento {discountPercent}%:</Text>
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

        {/* FOOTER (fixed at bottom) */}
        <View style={styles.footerFixed} fixed>
          <View style={styles.footerLeft}>
            <Text>Plazo de Entrega: {quotation.plazoEntrega || "—"}</Text>
            <Text>Validez Oferta: {formatDate(quotation.validUntil)}</Text>
            <Text>Cotizo: {cotizo}</Text>
          </View>
          <View style={styles.footerRight}>
            <View style={styles.firmaLine} />
            <Text style={styles.firmaText}>Firma Prestador de Servicio</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default QuotationPdf;