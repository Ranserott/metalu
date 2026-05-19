import { prisma } from "@/lib/prisma/prisma";
import { WorkOrderInput } from "../validations/workOrderSchemas";

const mockWorkOrders = [
  {
    id: "1",
    number: "OT-2024-001",
    clientId: "1",
    quotationId: null,
    title: "Instalacion de ventanas",
    description: "Instalacion de ventanas de aluminio",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: new Date("2024-12-20"),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getWorkOrders() {
  try {
    return await prisma.workOrder.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    });
  } catch {
    return mockWorkOrders;
  }
}

export async function getWorkOrderById(id: string) {
  try {
    return await prisma.workOrder.findUnique({
      where: { id, deletedAt: null },
    });
  } catch {
    return mockWorkOrders.find((wo) => wo.id === id) || null;
  }
}

export async function createWorkOrder(data: WorkOrderInput, userId: string) {
  try {
    return await prisma.workOrder.create({
      data: {
        ...data,
        createdById: userId,
      } as any,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updateWorkOrder(id: string, data: Partial<WorkOrderInput>) {
  try {
    return await prisma.workOrder.update({
      where: { id },
      data,
    });
  } catch {
    return { ...mockWorkOrders[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deleteWorkOrder(id: string) {
  try {
    return await prisma.workOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}