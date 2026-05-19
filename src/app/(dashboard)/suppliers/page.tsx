import { getSuppliers } from "@/modules/suppliers/services/supplierService";
import { SupplierTable } from "@/modules/suppliers/components/SupplierTable";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-gray-500">Gestion de proveedores</p>
        </div>
      </div>

      <SupplierTable data={suppliers} />
    </div>
  );
}