import { ReportInput } from "../validations/reportSchemas";

const mockReports = [
  {
    id: "1",
    name: "Ventas por Cliente",
    type: "SALES",
    description: "Reporte de ventas agrupadas por cliente",
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "Ordenes de Trabajo",
    type: "WORK_ORDERS",
    description: "Estado de todas las ordenes de trabajo",
    createdAt: new Date(),
  },
  {
    id: "3",
    name: "Facturas Pendientes",
    type: "INVOICES",
    description: "Facturas pendientes de pago",
    createdAt: new Date(),
  },
];

export async function getReports() {
  return mockReports;
}

export async function getReportById(id: string) {
  return mockReports.find((r) => r.id === id) || null;
}

export async function createReport(data: ReportInput) {
  return { ...data, id: Date.now().toString(), createdAt: new Date() };
}

export async function updateReport(id: string, data: Partial<ReportInput>) {
  return { ...mockReports[0], ...data, id, createdAt: new Date() };
}

export async function deleteReport(id: string) {
  return { id };
}