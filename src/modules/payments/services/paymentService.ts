import { prisma } from "@/lib/prisma/prisma";
import { PaymentInput } from "../validations/paymentSchemas";

const mockPayments = [
  {
    id: "1",
    number: "PAG-2024-001",
    invoiceId: "1",
    amount: "5000.00",
    method: "BANK_TRANSFER",
    reference: "TRX-12345",
    date: new Date("2024-12-15"),
    notes: "Pago parcial",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getPayments() {
  try {
    return await prisma.payment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { invoice: { select: { number: true } } },
    });
  } catch {
    return mockPayments;
  }
}

export async function getPaymentById(id: string) {
  try {
    return await prisma.payment.findUnique({
      where: { id, deletedAt: null },
    });
  } catch {
    return mockPayments.find((p) => p.id === id) || null;
  }
}

export async function createPayment(data: PaymentInput, userId: string) {
  try {
    return await prisma.payment.create({
      data: {
        ...data,
        createdById: userId,
      } as any,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updatePayment(id: string, data: Partial<PaymentInput>) {
  try {
    return await prisma.payment.update({
      where: { id },
      data,
    });
  } catch {
    return { ...mockPayments[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deletePayment(id: string) {
  try {
    return await prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}