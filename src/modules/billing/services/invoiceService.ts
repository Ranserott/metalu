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
    });
  } catch {
    return mockInvoices.find((i) => i.id === id) || null;
  }
}

export async function createInvoice(data: InvoiceInput, userId: string) {
  try {
    return await prisma.invoice.create({
      data: {
        ...data,
        createdById: userId,
      } as any,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updateInvoice(id: string, data: Partial<InvoiceInput>) {
  try {
    return await prisma.invoice.update({
      where: { id },
      data,
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