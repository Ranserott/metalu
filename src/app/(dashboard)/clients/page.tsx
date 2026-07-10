import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClients } from "@/modules/clients/services/clientService";
import { ClientTable } from "@/modules/clients/components/ClientTable";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Clientes"
        description="Gestión de clientes"
      />

      <ClientTable data={clients} />
    </div>
  );
}