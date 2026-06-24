import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { InvoiceForm } from "@/modules/billing/components/InvoiceForm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ workOrderId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { workOrderId } = await searchParams;
  return <InvoiceForm initialWorkOrderId={workOrderId} />;
}
