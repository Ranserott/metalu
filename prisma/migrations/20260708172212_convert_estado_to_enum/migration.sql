/*
  Warnings:

  - The `estado` column on the `supplier_documents` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SupplierDocumentStatus" AS ENUM ('PAGADO', 'PENDIENTE', 'CANCELADO');

-- AlterTable
ALTER TABLE "supplier_documents" DROP COLUMN "estado",
ADD COLUMN     "estado" "SupplierDocumentStatus" NOT NULL DEFAULT 'PENDIENTE';
