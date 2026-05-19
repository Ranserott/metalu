import { getInvoices } from "@/modules/billing/services/invoiceService";
import { InvoiceTable } from "@/modules/billing/components/InvoiceTable";

export default async function BillingPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-sm text-gray-500">Gestion de facturas</p>
        </div>
      </div>

      <InvoiceTable data={invoices} />
    </div>
  );
}