import { prisma } from "@/lib/prisma/prisma";
import { PurchaseInput } from "../validations/purchaseSchemas";

const mockPurchases = [
  {
    id: "1",
    number: "OC-2024-001",
    supplierId: "1",
    status: "SENT",
    subtotal: "5000.00",
    tax: "800.00",
    total: "5800.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getPurchases() {
  try {
    return await prisma.purchase.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { supplier: { select: { name: true } } },
    });
  } catch {
    return mockPurchases;
  }
}

export async function getPurchaseById(id: string) {
  try {
    return await prisma.purchase.findUnique({
      where: { id, deletedAt: null },
    });
  } catch {
    return mockPurchases.find((p) => p.id === id) || null;
  }
}

export async function createPurchase(data: PurchaseInput, userId: string) {
  try {
    return await prisma.purchase.create({
      data: {
        ...data,
        createdById: userId,
      } as any,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updatePurchase(id: string, data: Partial<PurchaseInput>) {
  try {
    return await prisma.purchase.update({
      where: { id },
      data,
    });
  } catch {
    return { ...mockPurchases[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deletePurchase(id: string) {
  try {
    return await prisma.purchase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}