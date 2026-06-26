/**
 * Company header information printed on documents (quotations, invoices, etc.).
 *
 * Edit the values below when the company info changes. To persist to a
 * settings table later, swap the consumers (QuotationPdf, etc.) to read
 * from the DB instead of importing this module.
 */
export const COMPANY = {
  name: "SOC.MECANICA Y METALURGICA ÑUBLE LTDA",
  address: "AVDA. FRANCIA Nº 352 CHILLAN",
  rut: "76.032.350-0",
  giro: "Metalurgica.",
  phone: "42-2278577",
  email: "metalurgica-nuble@hotmail.com",
  logoPath: "/logo.svg",
} as const;