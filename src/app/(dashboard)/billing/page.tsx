import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getInvoices } from "@/modules/billing/services/invoiceService";
import { InvoiceTable } from "@/modules/billing/components/InvoiceTable";

export default async function BillingPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Receipt}
        title="Facturas"
        description="Gestión de facturas"
        actions={
          <Link href="/billing/new">
            <Button className="bg-white text-[var(--theme-dark)] hover:bg-white/90">
              <Plus className="h-4 w-4 mr-2" />
              Ingresar documento
            </Button>
          </Link>
        }
      />

      <InvoiceTable data={invoices} />
    </div>
  );
}
