import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getSupplierById } from "@/modules/suppliers/services/supplierService";
import { SupplierDetailView } from "@/modules/suppliers/components/SupplierDetailView";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="p-6">No autorizado. Iniciá sesión.</div>;
  }

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  return <SupplierDetailView supplier={supplier} />;
}