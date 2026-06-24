import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getInvoices } from "@/modules/billing/services/invoiceService";
import { InvoiceTable } from "@/modules/billing/components/InvoiceTable";

export default async function BillingPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-sm text-muted-foreground">Gestión de facturas</p>
        </div>
        <Link href="/billing/new">
          <Button className="bg-[#14679C] hover:bg-[#14679C]/90">
            <Plus className="h-4 w-4 mr-2" />
            Ingresar documento
          </Button>
        </Link>
      </div>

      <InvoiceTable data={invoices} />
    </div>
  );
}