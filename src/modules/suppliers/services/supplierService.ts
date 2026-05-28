import { prisma } from "@/lib/prisma/prisma";
import { SupplierInput } from "../validations/supplierSchemas";

export async function getSuppliers() {
  return await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSupplierById(id: string) {
  return await prisma.supplier.findUnique({
    where: { id, deletedAt: null },
  });
}

export async function createSupplier(data: SupplierInput, userId: string) {
  return await prisma.supplier.create({
    data: {
      ...data,
      code: await generateSupplierCode(),
      createdById: userId,
    },
  });
}

export async function updateSupplier(id: string, data: Partial<SupplierInput>) {
  return await prisma.supplier.update({
    where: { id },
    data,
  });
}

export async function deleteSupplier(id: string) {
  return await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function generateSupplierCode() {
  const count = await prisma.supplier.count();
  return `PROV-${String(count + 1).padStart(4, "0")}`;
}
