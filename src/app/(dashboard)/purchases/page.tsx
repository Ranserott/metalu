import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getPurchases } from "@/modules/purchases/services/purchaseService";
import { getSolicitudes } from "@/modules/solicitudes/services/solicitudService";
import { PurchaseTable } from "@/modules/purchases/components/PurchaseTable";
import { SolicitudesTable } from "@/modules/solicitudes/components/SolicitudesTable";

export default async function PurchasesPage() {
  const [emitidas, solicitudes] = await Promise.all([
    getPurchases(),
    getSolicitudes(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Gestión de órdenes de compra</p>
        </div>
        <Link href="/purchases/solicitudes/new">
          <Button className="bg-[#14679C] hover:bg-[#14679C]/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva orden de compra
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="emitidas">
        <TabsList>
          <TabsTrigger value="emitidas">Emitidas</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
        </TabsList>
        <TabsContent value="emitidas" className="mt-4">
          <PurchaseTable data={emitidas as any} />
        </TabsContent>
        <TabsContent value="solicitudes" className="mt-4">
          <SolicitudesTable data={solicitudes as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
