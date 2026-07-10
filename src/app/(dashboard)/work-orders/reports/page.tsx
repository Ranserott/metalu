import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/prisma";
import { ReportsView } from "@/modules/work-orders-reports/components/ReportsView";
import type {
  ClientOption,
  EncargadoOption,
  LocalOption,
} from "@/modules/work-orders-reports/types/report";

export const dynamic = "force-dynamic";

export default async function WorkOrdersReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [clients, localesRaw, encargados] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.workOrder.findMany({
      where: { deletedAt: null, local: { not: null } },
      select: { local: true },
      distinct: ["local"],
      orderBy: { local: "asc" },
    }),
    prisma.encargado.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const clientOptions: ClientOption[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  const localOptions: LocalOption[] = localesRaw
    .map((l) => l.local)
    .filter((v): v is string => Boolean(v))
    .map((value) => ({ value }));

  const encargadoOptions: EncargadoOption[] = encargados.map((e) => ({
    id: e.id,
    name: e.name,
    clientId: e.clientId,
  }));

  return (
    <ReportsView
      clients={clientOptions}
      locales={localOptions}
      encargados={encargadoOptions}
    />
  );
}