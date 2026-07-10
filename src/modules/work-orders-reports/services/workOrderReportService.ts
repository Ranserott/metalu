import { prisma } from "@/lib/prisma/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  ByClientGroup,
  ByClientRow,
  ByClientTotals,
  ByWorkOrderRow,
  ByWorkOrderTotals,
  WorkOrderReportFilters,
} from "../types/report";

const toNumber = (v: unknown): number => (v == null ? 0 : Number(v));

function buildBaseWhere(filters: WorkOrderReportFilters): Prisma.WorkOrderWhereInput {
  const where: Prisma.WorkOrderWhereInput = {
    deletedAt: null,
  };

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.local) where.local = filters.local;
  if (filters.encargadoId) where.encargadoId = filters.encargadoId;

  if (filters.facturado === "yes") {
    where.OR = [
      { nroFactura: { not: null } },
      { invoices: { some: { deletedAt: null } } },
    ];
  } else if (filters.facturado === "no") {
    where.nroFactura = null;
    where.invoices = { none: {} };
  }

  if (filters.nroFactura) {
    where.nroFactura = { contains: filters.nroFactura, mode: "insensitive" };
  }
  if (filters.nroGuia) {
    where.nroGuia = { contains: filters.nroGuia, mode: "insensitive" };
  }
  if (filters.nroOrdenCompra) {
    where.nroOrdenCompra = { contains: filters.nroOrdenCompra, mode: "insensitive" };
  }

  return where;
}

function buildByWorkOrderWhere(filters: WorkOrderReportFilters): Prisma.WorkOrderWhereInput {
  const where = buildBaseWhere(filters);

  if (filters.status) where.status = filters.status as Prisma.EnumWorkOrderStatusFilter;
  if (filters.description) {
    where.description = { contains: filters.description, mode: "insensitive" };
  }
  if (filters.number) {
    where.number = { contains: filters.number, mode: "insensitive" };
  }

  if (filters.from || filters.to) {
    where.fechaTrabajo = {
      ...(filters.from && { gte: new Date(filters.from) }),
      ...(filters.to && { lte: new Date(filters.to) }),
    };
  }

  return where;
}

export type GetByClientResult = {
  groups: ByClientGroup[];
  totals: ByClientTotals;
};

export async function getByClient(
  filters: WorkOrderReportFilters
): Promise<GetByClientResult> {
  const where = buildBaseWhere(filters);

  if (filters.from || filters.to) {
    where.fechaTrabajo = {
      ...(filters.from && { gte: new Date(filters.from) }),
      ...(filters.to && { lte: new Date(filters.to) }),
    };
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, code: true } },
      encargadoRef: { select: { name: true } },
    },
    orderBy: [{ client: { name: "asc" } }, { fechaTrabajo: "desc" }, { number: "desc" }],
  });

  const groupMap = new Map<string, ByClientGroup>();

  for (const wo of workOrders) {
    const clientId = wo.clientId;
    if (!groupMap.has(clientId)) {
      groupMap.set(clientId, {
        clientId,
        clientName: wo.client.name,
        clientCode: wo.client.code,
        rows: [],
        groupTotal: 0,
      });
    }
    const group = groupMap.get(clientId)!;
    const row: ByClientRow = {
      id: wo.id,
      number: wo.number,
      fechaTrabajo: wo.fechaTrabajo,
      local: wo.local,
      encargadoNombre: wo.encargadoRef?.name ?? wo.encargado ?? null,
      nroFactura: wo.nroFactura,
      nroGuia: wo.nroGuia,
      nroOrdenCompra: wo.nroOrdenCompra,
      status: wo.status,
      total: toNumber(wo.total),
    };
    group.rows.push(row);
    group.groupTotal += row.total;
  }

  const groups = Array.from(groupMap.values());
  const totals: ByClientTotals = {
    count: groups.reduce((acc, g) => acc + g.rows.length, 0),
    totalAmount: groups.reduce((acc, g) => acc + g.groupTotal, 0),
  };

  return { groups, totals };
}

export type GetByWorkOrderResult = {
  rows: ByWorkOrderRow[];
  totals: ByWorkOrderTotals;
};

export async function getByWorkOrder(
  filters: WorkOrderReportFilters
): Promise<GetByWorkOrderResult> {
  const where = buildByWorkOrderWhere(filters);

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: [{ fechaTrabajo: "desc" }, { number: "desc" }],
  });

  const rows: ByWorkOrderRow[] = workOrders.map((wo) => ({
    id: wo.id,
    number: wo.number,
    fechaTrabajo: wo.fechaTrabajo,
    clientId: wo.clientId,
    clientName: wo.client.name,
    local: wo.local,
    status: wo.status,
    nroFactura: wo.nroFactura,
    nroGuia: wo.nroGuia,
    description: wo.description,
    total: toNumber(wo.total),
  }));

  const totals: ByWorkOrderTotals = {
    count: rows.length,
    totalAmount: rows.reduce((acc, r) => acc + r.total, 0),
  };

  return { rows, totals };
}