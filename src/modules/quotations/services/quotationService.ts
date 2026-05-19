import { prisma } from "@/lib/prisma/prisma";
import { QuotationInput } from "../validations/quotationSchemas";

// Mock data for development
const mockQuotations = [
  {
    id: "1",
    number: "COT-2024-001",
    clientId: "1",
    status: "SENT",
    validUntil: new Date("2024-12-31"),
    subtotal: "10000.00",
    tax: "1600.00",
    total: "11600.00",
    notes: "Primera cotizacion",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    number: "COT-2024-002",
    clientId: "2",
    status: "DRAFT",
    validUntil: new Date("2025-01-15"),
    subtotal: "5000.00",
    tax: "800.00",
    total: "5800.00",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getQuotations() {
  try {
    return await prisma.quotation.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    });
  } catch {
    return mockQuotations;
  }
}

export async function getQuotationById(id: string) {
  try {
    return await prisma.quotation.findUnique({
      where: { id, deletedAt: null },
    });
  } catch {
    return mockQuotations.find((q) => q.id === id) || null;
  }
}

export async function createQuotation(data: QuotationInput, userId: string) {
  try {
    return await prisma.quotation.create({
      data: {
        ...data,
        createdById: userId,
      } as any,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updateQuotation(id: string, data: Partial<QuotationInput>) {
  try {
    return await prisma.quotation.update({
      where: { id },
      data,
    });
  } catch {
    return { ...mockQuotations[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deleteQuotation(id: string) {
  try {
    return await prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}