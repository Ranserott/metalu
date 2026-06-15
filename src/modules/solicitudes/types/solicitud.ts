// NOTE: numeric fields (subtotal, tax, total, discount, quantity,
// unitPrice) are declared as `number` for DTO convenience, but the
// Prisma schema stores them as `Decimal`. The service layer is
// responsible for coercing `Prisma.Decimal` instances to `number`
// (via `.toNumber()`) before returning to consumers.

export type SolicitudStatus =
  | "SOLICITUD_GENERADA"
  | "EN_REVISION"
  | "ORDEN_EMITIDA"
  | "RECHAZADA"
  | "CANCELADA";

export type SolicitudDiscountType = "NONE" | "AMOUNT" | "PERCENT";

export type SolicitudItem = {
  id: string;
  solicitudId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SolicitudOrdenCompra = {
  id: string;
  number: string;
  workOrderId: string;
  workOrder: { number: string; title: string };
  clientId: string;
  client: { name: string; code: string };
  fechaTrabajo: Date;
  fechaEntrega: Date;
  diasSinOC: number;
  solicitud1: Date | null;
  solicitud2: Date | null;
  solicitud3: Date | null;
  notasInternas: string | null;
  status: SolicitudStatus;
  supplierId: string | null;
  supplier: { name: string } | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  discount: number | null;
  discountType: SolicitudDiscountType | null;
  purchaseId: string | null;
  rejectionReason: string | null;
  rejectedById: string | null;
  rejectedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: SolicitudItem[];
};

export type SolicitudOrdenCompraListItem = Omit<
  SolicitudOrdenCompra,
  "items"
> & {
  _count?: { items: number };
};
