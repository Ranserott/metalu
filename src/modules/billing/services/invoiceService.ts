import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/prisma";
import { InvoiceInput } from "../validations/invoiceSchemas";

const mockInvoices = [
  {
    id: "1",
    number: "FV-2024-001",
    clientId: "1",
    workOrderId: null,
    type: "INVOICE",
    status: "ISSUED",
    series: "A",
    numberInSeries: 1,
    issueDate: new Date("2024-12-01"),
    dueDate: new Date("2024-12-31"),
    subtotal: "10000.00",
    tax: "1600.00",
    total: "11600.00",
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function getInvoices() {
  try {
    return await prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    });
  } catch {
    return mockInvoices;
  }
}

export async function getInvoiceById(id: string) {
  try {
    return await prisma.invoice.findUnique({
      where: { id, deletedAt: null },
      include: { items: true },
    });
  } catch {
    return mockInvoices.find((i) => i.id === id) || null;
  }
}

export async function createInvoice(data: InvoiceInput, userId: string) {
  const number = data.number || (await nextInvoiceNumber());
  const { items, abonos, saldo, ...rest } = data;

  try {
    return await prisma.invoice.create({
      data: {
        number,
        clientId: rest.clientId,
        workOrderId: rest.workOrderId,
        type: rest.type as Prisma.InvoiceCreateInput["type"],
        status: rest.status as Prisma.InvoiceCreateInput["status"],
        series: rest.series,
        numberInSeries: rest.numberInSeries,
        issueDate: rest.issueDate,
        dueDate: rest.dueDate,
        subtotal: rest.subtotal as Prisma.InvoiceCreateInput["subtotal"],
        tax: rest.tax as Prisma.InvoiceCreateInput["tax"],
        total: rest.total as Prisma.InvoiceCreateInput["total"],
        tipoDocumento: rest.tipoDocumento ?? "Factura Electrónica",
        abonos: abonos as any,
        saldo: saldo as any,
        guiasAsociadas: rest.guiasAsociadas,
        createdById: userId,
        items: items?.length
          ? {
              create: items.map((item) => ({
                description: item.description,
                quantity: item.quantity as Prisma.InvoiceItemCreateInput["quantity"],
                unitPrice: item.unitPrice as Prisma.InvoiceItemCreateInput["unitPrice"],
                total: item.total as Prisma.InvoiceItemCreateInput["total"],
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
  } catch {
    return {
      ...rest,
      number,
      abonos,
      saldo,
      items,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function updateInvoice(id: string, data: Partial<InvoiceInput>) {
  try {
    return await prisma.invoice.update({
      where: { id },
      data: data as Prisma.InvoiceUncheckedUpdateInput as any,
    });
  } catch {
    return { ...mockInvoices[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deleteInvoice(id: string) {
  try {
    return await prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}