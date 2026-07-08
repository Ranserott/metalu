"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { Supplier } from "../types/supplier";
import {
  SupplierDocument,
  SUPPLIER_DOCUMENT_TYPE_LABELS,
} from "../types/supplierDocument";
import { SupplierDocumentFormModal } from "./SupplierDocumentFormModal";

type Props = {
  supplier: Supplier;
};

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CL");
}

export function SupplierDetailView({ supplier }: Props) {
  const router = useRouter();
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function fetchDocuments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/documents`);
      if (!res.ok) throw new Error("Error al cargar documentos");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, [supplier.id]);

  async function handleDelete(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      await fetchDocuments();
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido");
    } finally {
      setDeletingId(null);
    }
  }

  const totalValue = documents.reduce((sum, d) => sum + Number(d.valor), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/suppliers")}
            className="border-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            <p className="text-sm text-gray-500">Código {supplier.code}</p>
          </div>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Documento
        </Button>
      </div>

      {/* Supplier info card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase">Contacto</p>
          <p className="font-semibold">{supplier.contact || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Email</p>
          <p className="font-semibold truncate">{supplier.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Teléfono</p>
          <p className="font-semibold">{supplier.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Ciudad</p>
          <p className="font-semibold">{(supplier as any).ciudad || "—"}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Documents section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--theme-primary)]" />
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--theme-dark)]">
              Documentos registrados
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>
          <span className="text-sm text-gray-600">
            Total:{" "}
            <span className="font-bold text-[var(--theme-dark)]">
              {new Intl.NumberFormat("es-CL", {
                style: "currency",
                currency: "CLP",
              }).format(totalValue)}
            </span>
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 py-4 text-center border rounded-lg">
            Cargando...
          </p>
        ) : documents.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No hay documentos registrados para este proveedor.
            </p>
            <Button
              variant="link"
              onClick={() => setFormOpen(true)}
              className="text-[var(--theme-primary)] mt-1"
            >
              Ingresar el primero
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Nombre</th>
                  <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Tipo</th>
                  <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Documento</th>
                  <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">F. Emisión</th>
                  <th className="text-right p-2 font-semibold text-gray-600 uppercase text-xs">Valor</th>
                  <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">F. Vencimiento</th>
                  <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Estado</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t hover:bg-blue-50/40">
                    <td className="p-2 font-medium">{doc.nombre}</td>
                    <td className="p-2">{SUPPLIER_DOCUMENT_TYPE_LABELS[doc.tipoDocumento]}</td>
                    <td className="p-2 font-mono text-xs">{doc.documento}</td>
                    <td className="p-2 text-gray-700">{formatDate(doc.fechaDocumento)}</td>
                    <td className="p-2 text-right font-semibold">
                      {new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      }).format(Number(doc.valor))}
                    </td>
                    <td className="p-2 text-gray-700">{formatDate(doc.fechaVencimiento)}</td>
                    <td className="p-2">{doc.estado}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        title="Eliminar"
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierDocumentFormModal
        supplierId={supplier.id}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchDocuments}
      />
    </div>
  );
}