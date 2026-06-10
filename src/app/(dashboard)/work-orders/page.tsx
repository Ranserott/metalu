"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkOrderTable } from "@/modules/work-orders/components/WorkOrderTable";
import { WorkOrderForm } from "@/modules/work-orders/components/WorkOrderForm";
import { WorkOrder } from "@/modules/work-orders/types/workOrder";
import { WorkOrderItemInput } from "@/modules/work-orders/validations/workOrderSchemas";

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nextNumber, setNextNumber] = useState<string>("");

  const fetchWorkOrders = async () => {
    try {
      const res = await fetch("/api/work-orders");
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data);
      }
    } catch (err) {
      console.error("[work-orders page] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNumber = async () => {
    try {
      const res = await fetch("/api/work-orders/next-number");
      if (res.ok) {
        const { number } = await res.json();
        setNextNumber(number);
      }
    } catch (err) {
      console.error("[work-orders page] next-number error:", err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function handleNew() {
    await fetchNextNumber();
    setModalOpen(true);
  }

  async function handleSubmit(payload: Record<string, any>, items: WorkOrderItemInput[]) {
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, items }),
    });
    if (res.ok) {
      await fetchWorkOrders();
      setModalOpen(false);
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error("[work-orders page] save error:", errorData);
      alert(`Error al guardar: ${JSON.stringify(errorData)}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Trabajos</h1>
          <p className="text-sm text-gray-500">Gestión de trabajos y órdenes de trabajo</p>
        </div>
        <Button onClick={handleNew} className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)]">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Trabajo
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <WorkOrderTable data={workOrders} />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="full" className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">NUEVO TRABAJO</DialogTitle>
          </DialogHeader>
          <WorkOrderForm
            key={nextNumber || "new"}
            initialNumber={nextNumber}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
