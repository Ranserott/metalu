"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkOrderTable } from "@/modules/work-orders/components/WorkOrderTable";
import { WorkOrderForm } from "@/modules/work-orders/components/WorkOrderForm";
import { WorkOrderDetailView } from "@/modules/work-orders/components/WorkOrderDetailView";
import { WorkOrder } from "@/modules/work-orders/types/workOrder";
import { WorkOrderItemInput } from "@/modules/work-orders/validations/workOrderSchemas";

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<WorkOrder | null>(null);
  const [editData, setEditData] = useState<any>(undefined);
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
    setEditData(undefined);
    setModalOpen(true);
  }

  async function handleView(wo: WorkOrder) {
    try {
      const res = await fetch(`/api/work-orders/${wo.id}`);
      if (res.ok) {
        const full = await res.json();
        setViewData(full);
        setViewOpen(true);
      } else {
        alert("Error al cargar el trabajo");
      }
    } catch (err) {
      console.error("[work-orders page] view error:", err);
      alert("Error al cargar el trabajo");
    }
  }

  async function handleEdit(wo: WorkOrder) {
    try {
      const res = await fetch(`/api/work-orders/${wo.id}`);
      if (res.ok) {
        const full = await res.json();
        setEditData(full);
        setModalOpen(true);
      } else {
        alert("Error al cargar el trabajo");
      }
    } catch (err) {
      console.error("[work-orders page] edit error:", err);
      alert("Error al cargar el trabajo");
    }
  }

  async function handleStatusChange(wo: WorkOrder, newStatus: string) {
    try {
      const res = await fetch(`/api/work-orders/${wo.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al actualizar el estado");
      }
      await fetchWorkOrders();
    } catch (err: any) {
      console.error("[work-orders page] status change error:", err);
      alert(err?.message ?? "Error al actualizar el estado");
    }
  }

  async function handleSubmit(payload: Record<string, any>, items: WorkOrderItemInput[]) {
    const isEdit = !!payload.id;
    const url = isEdit ? `/api/work-orders/${payload.id}` : "/api/work-orders";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, items }),
    });
    if (res.ok) {
      await fetchWorkOrders();
      setModalOpen(false);
      setEditData(undefined);
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
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/work-orders/reports")}
            variant="outline"
            className="border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Informes
          </Button>
          <Button onClick={handleNew} className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)]">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Trabajo
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <WorkOrderTable
          data={workOrders}
          onView={handleView}
          onEdit={handleEdit}
          onDeleteSuccess={fetchWorkOrders}
          onStatusChange={handleStatusChange}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="full" className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
              {editData?.id ? "MODIFICAR TRABAJO" : "NUEVO TRABAJO"}
            </DialogTitle>
          </DialogHeader>
          <WorkOrderForm
            key={editData?.id || nextNumber || "new"}
            initialNumber={editData ? undefined : nextNumber}
            initialData={editData?.id ? editData : null}
            editMode={!!editData?.id}
            onSubmit={handleSubmit}
            onCancel={() => {
              setModalOpen(false);
              setEditData(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent size="wide" className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
              DETALLE DE TRABAJO
            </DialogTitle>
          </DialogHeader>
          {viewData && <WorkOrderDetailView workOrder={viewData} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
