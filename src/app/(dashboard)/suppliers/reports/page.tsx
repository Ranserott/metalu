import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/prisma";
import { ReportsView } from "@/modules/suppliers-reports/components/ReportsView";
import type { SupplierOption } from "@/modules/suppliers-reports/types/report";

export const dynamic = "force-dynamic";

export default async function SupplierReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const options: SupplierOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }));

  return <ReportsView suppliers={options} />;
}
