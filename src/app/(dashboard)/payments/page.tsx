"use client";

import { useState, useEffect, useCallback } from "react";
import { PaymentAccordion } from "@/modules/payments/components/PaymentAccordion";
import { PaymentTable } from "@/modules/payments/components/PaymentTable";
import { SupplierDocumentInput } from "@/modules/payments/validations/paymentSchemas";

type SupplierDocumentRow = {
  id: string;
  number: string;
  supplier: { code: string; name: string } | null;
  documentType: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  amount: number;
  dueDate: Date | null;
  status: string;
};

export default function PaymentsPage() {
  const [documents, setDocuments] = useState<SupplierDocumentRow[]>([]);
  const [editData, setEditData] = useState<SupplierDocumentInput & { id: string } | undefined>();

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/payments");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function handleEdit(doc: SupplierDocumentRow) {
    setEditData({
      id: doc.id,
      supplierId: doc.supplier?.code ?? "",
      documentType: doc.documentType as SupplierDocumentInput["documentType"],
      documentNumber: doc.documentNumber ?? "",
      documentDate: doc.documentDate ? new Date(doc.documentDate) : new Date(),
      amount: Number(doc.amount),
      dueDate: doc.dueDate ? new Date(doc.dueDate) : null,
      status: doc.status as SupplierDocumentInput["status"],
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-gray-500">Accounts Payable — Documentos de Proveedores</p>
        </div>
      </div>

      <PaymentAccordion
        onSuccess={fetchDocuments}
        editData={editData}
        onEditClear={() => setEditData(undefined)}
      />

      <div className="border rounded-lg overflow-hidden">
        <PaymentTable
          data={documents}
          onEdit={handleEdit}
          onCancelSuccess={fetchDocuments}
        />
      </div>
    </div>
  );
}