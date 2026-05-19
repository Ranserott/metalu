import { getClients } from "@/modules/clients/services/clientService";
import { ClientTable } from "@/modules/clients/components/ClientTable";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-gray-500">Gestion de clientes</p>
        </div>
      </div>

      <ClientTable data={clients} />
    </div>
  );
}