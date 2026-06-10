"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuotationForm } from "@/modules/quotations/components/QuotationForm";
import { QuotationTable } from "@/modules/quotations/components/QuotationTable";
import { QuotationView } from "@/modules/quotations/components/QuotationView";
import { Quotation } from "@/modules/quotations/types/quotation";
import { QuotationInput } from "@/modules/quotations/validations/quotationSchemas";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editData, setEditData] = useState<any>(undefined);
  const [viewData, setViewData] = useState<any>(undefined);

  const fetchQuotations = async () => {
    const res = await fetch("/api/quotations");
    if (res.ok) {
      const data = await res.json();
      setQuotations(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  async function handleEdit(quotation: Quotation) {
    const res = await fetch(`/api/quotations/${quotation.id}`);
    if (res.ok) {
      const fullQuotation = await res.json();
      setEditData({
        id: fullQuotation.id,
        number: fullQuotation.number,
        clientId: fullQuotation.clientId,
        clientName: fullQuotation.client?.name || "",
        status: fullQuotation.status,
        validUntil: new Date(fullQuotation.validUntil).toISOString().split('T')[0],
        notes: fullQuotation.notes || "",
        discount: fullQuotation.discount ? String(fullQuotation.discount) : "0",
        discountType: fullQuotation.discountType ?? "NONE",
        items: fullQuotation.items || [],
      });
      setModalOpen(true);
    } else {
      alert("Error al cargar la cotización");
    }
  }

  async function handleView(quotation: Quotation) {
    const res = await fetch(`/api/quotations/${quotation.id}`);
    if (res.ok) {
      const fullQuotation = await res.json();
      setViewData(fullQuotation);
      setViewOpen(true);
    } else {
      alert("Error al cargar la cotización");
    }
  }

  async function handleNew() {
    setEditData(undefined);
    const res = await fetch("/api/quotations/next-number");
    if (res.ok) {
      const { number } = await res.json();
      setEditData({ number } as any);
    }
    setModalOpen(true);
  }

  async function handleSubmit(data: QuotationInput & { items?: any[] }) {
    const isEdit = editData && editData.id;
    const url = isEdit ? `/api/quotations/${editData.id}` : "/api/quotations";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      fetchQuotations();
      setModalOpen(false);
      setEditData(undefined);
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error("Error al guardar cotización:", errorData);
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
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Gestión de cotizaciones</p>
        </div>
        <Button onClick={handleNew} className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)]">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <QuotationTable
          data={quotations}
          onEdit={handleEdit}
          onView={handleView}
          onDeleteSuccess={fetchQuotations}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="full" className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
              {editData?.id ? "MODIFICAR COTIZACIÓN" : "NUEVA COTIZACIÓN"}
            </DialogTitle>
          </DialogHeader>
          <QuotationForm key={editData?.id || "new"} onSubmit={handleSubmit} defaultValues={editData} editMode={!!editData?.id} />
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent size="lg" className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
              DETALLE DE COTIZACIÓN
            </DialogTitle>
          </DialogHeader>
          {viewData && <QuotationView quotation={viewData} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
