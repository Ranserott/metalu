import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { workOrderReportFiltersSchema } from "@/modules/work-orders-reports/validations/reportSchemas";
import {
  getByClient,
  getByWorkOrder,
} from "@/modules/work-orders-reports/services/workOrderReportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    type: searchParams.get("type") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    local: searchParams.get("local") ?? undefined,
    encargadoId: searchParams.get("encargadoId") ?? undefined,
    facturado: searchParams.get("facturado") ?? undefined,
    nroFactura: searchParams.get("nroFactura") ?? undefined,
    nroGuia: searchParams.get("nroGuia") ?? undefined,
    nroOrdenCompra: searchParams.get("nroOrdenCompra") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    description: searchParams.get("description") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    number: searchParams.get("number") ?? undefined,
  };

  const parsed = workOrderReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { type, ...filters } = parsed.data;

  try {
    if (type === "by-client") {
      const result = await getByClient(filters);
      return NextResponse.json(result);
    }
    // type === "by-workorder"
    const result = await getByWorkOrder(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[work-orders-reports] error generating report", err);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}