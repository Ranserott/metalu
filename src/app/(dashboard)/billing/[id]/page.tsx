import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getInvoiceById } from "@/modules/billing/services/invoiceService";
import { InvoiceDetailView } from "@/modules/billing/components/InvoiceDetailView";
import { isAdmin } from "@/lib/auth/permissions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="p-6">No autorizado. Iniciá sesión.</div>;
  }

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const admin = isAdmin(session.user.roles);

  return (
    <InvoiceDetailView
      invoice={invoice as any}
      currentUser={{
        id: session.user.id,
        role: admin ? "admin" : "trabajador",
      }}
    />
  );
}
