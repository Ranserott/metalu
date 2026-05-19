import { getQuotations } from "@/modules/quotations/services/quotationService";
import { QuotationTable } from "@/modules/quotations/components/QuotationTable";

export default async function QuotationsPage() {
  const quotations = await getQuotations();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Gestion de cotizaciones</p>
        </div>
      </div>

      <QuotationTable data={quotations} />
    </div>
  );
}