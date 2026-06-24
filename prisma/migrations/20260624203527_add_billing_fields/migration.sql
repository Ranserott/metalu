-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "abonos" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "guias_asociadas" TEXT,
ADD COLUMN     "saldo" DECIMAL(12,2),
ADD COLUMN     "tipo_documento" TEXT DEFAULT 'Factura Electrónica';
