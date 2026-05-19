import { getPayments } from "@/modules/payments/services/paymentService";
import { PaymentTable } from "@/modules/payments/components/PaymentTable";

export default async function PaymentsPage() {
  const payments = await getPayments();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-gray-500">Gestion de pagos</p>
        </div>
      </div>

      <PaymentTable data={payments} />
    </div>
  );
}