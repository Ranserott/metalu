import { getPurchases } from "@/modules/purchases/services/purchaseService";
import { PurchaseTable } from "@/modules/purchases/components/PurchaseTable";

export default async function PurchasesPage() {
  const purchases = await getPurchases();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-gray-500">Gestion de ordenes de compra</p>
        </div>
      </div>

      <PurchaseTable data={purchases} />
    </div>
  );
}