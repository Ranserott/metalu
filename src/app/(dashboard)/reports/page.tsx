import { prisma } from "@/lib/prisma/prisma";
import { ReportsView } from "@/modules/reports/components/ReportsView";

export default async function ReportsPage() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ReportsView clients={clients} />;
}