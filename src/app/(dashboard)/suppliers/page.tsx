"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierAccordion } from "@/modules/suppliers/components/SupplierAccordion";
import { SupplierTable } from "@/modules/suppliers/components/SupplierTable";
import { SupplierInput } from "@/modules/suppliers/validations/supplierSchemas";
import { Supplier } from "@/modules/suppliers/types/supplier";

console.log(">>> SuppliersPage rendering");

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editData, setEditData] = useState<SupplierInput & { id: string } | undefined>();

  const fetchSuppliers = useCallback(async () => {
    const res = await fetch("/api/suppliers");
    if (res.ok) {
      const data = await res.json();
      setSuppliers(data);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  function handleEdit(supplier: Supplier) {
    setEditData({
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact ?? undefined,
      email: supplier.email ?? undefined,
      phone: supplier.phone ?? undefined,
      address: supplier.address ?? undefined,
      ciudad: (supplier as any).ciudad ?? undefined,
      isActive: supplier.isActive,
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Truck}
        title="Proveedores"
        description="Gestión de proveedores"
      />

      <SupplierAccordion
        onSuccess={fetchSuppliers}
        editData={editData}
        onEditClear={() => setEditData(undefined)}
      />

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <SupplierTable
          data={suppliers}
          onEdit={handleEdit}
          onDeleteSuccess={fetchSuppliers}
        />
      </div>
    </div>
  );
}