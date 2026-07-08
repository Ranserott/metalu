-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('FACTURA', 'BOLETA', 'PAGARE', 'OTROS', 'CHEQUE');

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_documento" "SupplierDocumentType" NOT NULL,
    "documento" TEXT NOT NULL,
    "fecha_documento" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_documents_supplier_id_idx" ON "supplier_documents"("supplier_id");

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
