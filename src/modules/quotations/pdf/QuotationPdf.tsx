import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/config/company";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatNumber(n: number): string {
  return numberFormatter.format(Number.isFinite(n) ? n : 0);
}

function formatQuantity(n: number): string {
  return n.toFixed(2);
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

type DecimalLike = { toNumber: () => number };

function isDecimalLike(v: unknown): v is DecimalLike {
  return typeof v === "object" && v !== null && "toNumber" in v && typeof v.toNumber === "function";
}

function toNum(v: number | string | DecimalLike | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (isDecimalLike(v)) {
    try {
      return v.toNumber();
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
    createdBy?: { id: string; name: string | null } | null;
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
  logoSrc?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 12,
    fontFamily: "Courier",
    fontSize: 10,
    color: "#111",
  },
  bold: {
    fontWeight: 700,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  logoWrap: {
    width: 135,
  },
  logo: {
    width: 92,
    height: 92,
  },
  headerCenter: {
    width: 330,
    paddingTop: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 3,
    letterSpacing: 1.2,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700,
  },
  companyLine: {
    fontSize: 10,
    lineHeight: 1.15,
  },
  companyMail: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  pageNumber: {
    width: 90,
    paddingTop: 30,
    fontSize: 9,
    textAlign: "right",
  },
  clientDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 2,
  },
  clientBlock: {
    width: 410,
  },
  fieldRow: {
    flexDirection: "row",
    minHeight: 12,
  },
  label: {
    width: 76,
    fontWeight: 700,
  },
  fieldValue: {
    flexGrow: 1,
  },
  dateBlock: {
    width: 165,
    paddingTop: 2,
    flexDirection: "row",
  },
  dateLabel: {
    width: 45,
  },
  description: {
    marginTop: 1,
    marginBottom: 3,
    flexDirection: "row",
  },
  descriptionLabel: {
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 1,
    marginBottom: 1,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#888",
    paddingBottom: 1,
    marginBottom: 2,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    minHeight: 14,
  },
  itemCol: {
    width: 34,
  },
  descCol: {
    width: 350,
  },
  unitCol: {
    width: 58,
    textAlign: "right",
  },
  priceCol: {
    width: 82,
    textAlign: "right",
  },
  totalCol: {
    width: 82,
    textAlign: "right",
  },
  sectionTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 3,
    marginBottom: 2,
    fontWeight: 700,
  },
  sectionTotalLabel: {
    width: 60,
    textAlign: "right",
  },
  sectionTotalValue: {
    width: 92,
    textAlign: "right",
  },
  summaryTable: {
    width: 382,
    marginTop: 0,
  },
  summaryHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#aaa",
    paddingBottom: 1,
    fontWeight: 700,
  },
  summaryRow: {
    flexDirection: "row",
    minHeight: 14,
    fontWeight: 700,
  },
  summaryItemCol: {
    width: 44,
    textAlign: "right",
    paddingRight: 10,
  },
  summaryDescCol: {
    width: 240,
  },
  summaryTotalCol: {
    width: 98,
    textAlign: "right",
  },
  totalsBlock: {
    width: 450,
    marginTop: 4,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#888",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: 14,
    fontWeight: 700,
  },
  totalsLabel: {
    width: 170,
    textAlign: "right",
  },
  totalsValue: {
    width: 98,
    textAlign: "right",
  },
  totalsPercent: {
    width: 60,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    width: 260,
    fontSize: 10,
  },
  stamp: {
    width: 150,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#ddd",
    paddingTop: 4,
  },
  stampText: {
    fontSize: 7,
    textAlign: "center",
    color: "#333",
  },
});

function FieldRow({ label, value, boldValue = false }: { label: string; value?: string | null; boldValue?: boolean }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.fieldValue, boldValue ? styles.bold : null]}>{value || ""}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ItemsTable({ items, total }: { items: Item[]; total: number }) {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={styles.itemCol}>Item</Text>
        <Text style={styles.descCol}>Descripcion</Text>
        <Text style={styles.unitCol}>Unidad</Text>
        <Text style={styles.priceCol}>P.Unitario</Text>
        <Text style={styles.totalCol}>Total</Text>
      </View>
      {items.map((item, index) => (
        <View style={styles.row} key={item.id}>
          <Text style={styles.itemCol}>{index + 1}</Text>
          <Text style={styles.descCol}>{item.description}</Text>
          <Text style={styles.unitCol}>{formatQuantity(toNum(item.quantity))}</Text>
          <Text style={styles.priceCol}>{formatNumber(toNum(item.unitPrice))}</Text>
          <Text style={styles.totalCol}>{formatNumber(toNum(item.total))}</Text>
        </View>
      ))}
      <View style={styles.sectionTotal}>
        <Text style={styles.sectionTotalLabel}>Total</Text>
        <Text style={styles.sectionTotalValue}>{total > 0 ? formatNumber(total) : ""}</Text>
      </View>
    </View>
  );
}

function SummaryRow({ item, description, total }: { item: number; description: string; total?: number }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryItemCol}>{item}</Text>
      <Text style={styles.summaryDescCol}>{description}</Text>
      <Text style={styles.summaryTotalCol}>{total && total > 0 ? formatNumber(total) : ""}</Text>
    </View>
  );
}

export function QuotationPdf({ quotation, logoSrc }: Props) {
  const items = quotation.items ?? [];
  const materials = items.filter((item) => item.type === "MATERIAL");
  const works = items.filter((item) => item.type === "WORK");

  const materialsTotal = materials.reduce((acc, item) => acc + toNum(item.total), 0);
  const worksTotal = works.reduce((acc, item) => acc + toNum(item.total), 0);

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
  const cotizo = quotation.createdBy?.name?.trim() || "";

  return (
    <Document title={`Cotizacion ${quotation.number}`} author={COMPANY.name} subject={`Cotizacion ${quotation.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.logoWrap}>{logoSrc ? <Image src={logoSrc} style={styles.logo} alt="Logo Metalurgica Ñuble" /> : null}</View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>COTIZACION N°{quotation.number}</Text>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            <Text style={styles.companyLine}>{COMPANY.address} {COMPANY.city}</Text>
            <Text style={styles.companyLine}>RUT {COMPANY.rut}</Text>
            <Text style={styles.companyLine}>GIRO: {COMPANY.giro}</Text>
            <Text style={styles.companyLine}>FONO: {COMPANY.phone}</Text>
            <Text style={styles.companyMail}>MAIL: {COMPANY.email}</Text>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber }) => `Pagina    ${pageNumber}`} fixed />
        </View>

        <View style={styles.clientDateRow}>
          <View style={styles.clientBlock}>
            <FieldRow label="Cliente" value={quotation.client?.name} boldValue />
            <FieldRow label="Rut" value={quotation.client?.code} boldValue />
            <FieldRow label="Direccion" value={quotation.client?.address} />
            <FieldRow label="Ciudad" value={quotation.client?.city} />
            <FieldRow label="Atencion" value={quotation.atencion} boldValue />
            <FieldRow label="Area" value={quotation.area} />
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Fecha</Text>
            <Text>{formatDate(quotation.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionLabel}>Descripcion Trabajo:</Text>
          <Text style={styles.bold}> {quotation.descripcionTrabajo || ""}</Text>
        </View>

        <SectionTitle>I. DETALLE DE MATERIALES</SectionTitle>
        <ItemsTable items={materials} total={materialsTotal} />

        <SectionTitle>II. DETALLE DE TRABAJOS REALIZADOS</SectionTitle>
        <ItemsTable items={works} total={worksTotal} />

        <SectionTitle>IV. RESUMEN GENERAL</SectionTitle>
        <View style={styles.summaryTable}>
          <View style={styles.summaryHeader}>
            <Text style={styles.itemCol}>Item</Text>
            <Text style={styles.summaryDescCol}>Descripcion</Text>
            <Text style={styles.summaryTotalCol}>Total</Text>
          </View>
          <SummaryRow item={1} description="Detalle de Materiales" total={materialsTotal} />
          <SummaryRow item={2} description="Detalle de Trabajos Realizados" total={worksTotal} />
          <SummaryRow item={3} description="Mano de Obra" />
          <SummaryRow item={4} description="G.G. y Utilidades" />
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sub-Total Neto</Text>
            <Text style={styles.totalsValue}>{formatNumber(subtotal)}</Text>
            <Text style={styles.totalsPercent}></Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>(-) Descuento</Text>
            <Text style={styles.totalsValue}>{discountAmount > 0 ? formatNumber(discountAmount) : ""}</Text>
            <Text style={styles.totalsPercent}>{discountPercent > 0 ? `${discountPercent}%` : "%"}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Neto</Text>
            <Text style={styles.totalsValue}>{formatNumber(neto)}</Text>
            <Text style={styles.totalsPercent}></Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Iva</Text>
            <Text style={styles.totalsValue}>{formatNumber(tax)}</Text>
            <Text style={styles.totalsPercent}></Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total</Text>
            <Text style={styles.totalsValue}>{formatNumber(total)}</Text>
            <Text style={styles.totalsPercent}></Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text>Plazo de Entrega: {quotation.plazoEntrega || ""}</Text>
            <Text>Validez Oferta: {formatDate(quotation.validUntil)}</Text>
            <Text>Cotizo: {cotizo}</Text>
          </View>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>Soc. Metalurgica Ñuble Ltda.</Text>
            <Text style={styles.stampText}>RUT: {COMPANY.rut}</Text>
            <Text style={styles.stampText}>{COMPANY.address}</Text>
            <Text style={styles.stampText}>FONO: {COMPANY.phone} / {COMPANY.city}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default QuotationPdf;
