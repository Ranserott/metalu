"use client";

import { useState, useEffect, useCallback } from "react";
import { SupplierAccordion } from "@/modules/suppliers/components/SupplierAccordion";
import { SupplierTable } from "@/modules/suppliers/components/SupplierTable";
import { SupplierInput } from "@/modules/suppliers/validations/supplierSchemas";
import { Supplier } from "@/modules/suppliers/types/supplier";

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-gray-500">Gestión de proveedores</p>
        </div>
      </div>

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