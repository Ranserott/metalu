import { getWorkOrders } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderTable } from "@/modules/work-orders/components/WorkOrderTable";

export default async function WorkOrdersPage() {
  const workOrders = await getWorkOrders();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ordenes de Trabajo</h1>
          <p className="text-sm text-gray-500">Gestion de ordenes de trabajo</p>
        </div>
      </div>

      <WorkOrderTable data={workOrders} />
    </div>
  );
}