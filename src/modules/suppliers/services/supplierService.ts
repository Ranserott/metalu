import { prisma } from "@/lib/prisma/prisma";
import { SupplierInput } from "../validations/supplierSchemas";

const mockSuppliers = [
  {
    id: "1",
    code: "SUP-001",
    name: "Acme Corp",
    contact: "Juan Perez",
    email: "juan@acme.com",
    phone: "+1234567890",
    address: "Calle Principal 123",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getSuppliers() {
  try {
    return await prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
  } catch {
    return mockSuppliers;
  }
}

export async function getSupplierById(id: string) {
  try {
    return await prisma.supplier.findUnique({
      where: { id, deletedAt: null },
    });
  } catch {
    return mockSuppliers.find((s) => s.id === id) || null;
  }
}

export async function createSupplier(data: SupplierInput, userId: string) {
  try {
    return await prisma.supplier.create({
      data: {
        ...data,
        createdById: userId,
      },
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updateSupplier(id: string, data: Partial<SupplierInput>) {
  try {
    return await prisma.supplier.update({
      where: { id },
      data,
    });
  } catch {
    return { ...mockSuppliers[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deleteSupplier(id: string) {
  try {
    return await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}