import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma/prisma";
import { PurchaseInput } from "../validations/purchaseSchemas";

const INCLUDE_BASE = {
  supplier: { select: { id: true, name: true } },
};

async function nextPurchaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;
  const last = await prisma.purchase.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function getPurchases() {
  return prisma.purchase.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: INCLUDE_BASE,
  });
}

export async function getPurchaseById(id: string) {
  return prisma.purchase.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_BASE,
  });
}

export async function createPurchase(data: PurchaseInput, userId: string) {
  const number = data.number || (await nextPurchaseNumber());
  return prisma.purchase.create({
    data: {
      number,
      supplierId: data.supplierId,
      status: (data.status || "DRAFT") as Prisma.PurchaseCreateInput["status"],
      subtotal: data.subtotal as Prisma.PurchaseCreateInput["subtotal"],
      tax: data.tax as Prisma.PurchaseCreateInput["tax"],
      total: data.total as Prisma.PurchaseCreateInput["total"],
      createdById: userId,
    },
  });
}

export async function updatePurchase(id: string, data: Partial<PurchaseInput>) {
  return prisma.purchase.update({
    where: { id },
    data: data as Prisma.PurchaseUncheckedUpdateInput as any,
  });
}

export async function deletePurchase(id: string) {
  return prisma.purchase.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
