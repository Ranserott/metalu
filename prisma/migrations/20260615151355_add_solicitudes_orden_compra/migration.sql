-- CreateEnum
CREATE TYPE "SolicitudStatus" AS ENUM ('SOLICITUD_GENERADA', 'EN_REVISION', 'ORDEN_EMITIDA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SolicitudDiscountType" AS ENUM ('NONE', 'AMOUNT', 'PERCENT');

-- CreateTable
CREATE TABLE "solicitudes_orden_compra" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "fecha_trabajo" TIMESTAMP(3) NOT NULL,
    "fecha_entrega" TIMESTAMP(3) NOT NULL,
    "dias_sin_oc" INTEGER NOT NULL DEFAULT 0,
    "solicitud_1" TIMESTAMP(3),
    "solicitud_2" TIMESTAMP(3),
    "solicitud_3" TIMESTAMP(3),
    "notas_internas" TEXT,
    "status" "SolicitudStatus" NOT NULL DEFAULT 'SOLICITUD_GENERADA',
    "purchase_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "supplier_id" TEXT,
    "subtotal" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "discount" DECIMAL(12,2) DEFAULT 0,
    "discount_type" "SolicitudDiscountType" DEFAULT 'NONE',
    "rejection_reason" TEXT,
    "rejected_by_id" TEXT,
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "solicitudes_orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_items" (
    "id" TEXT NOT NULL,
    "solicitud_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "solicitud_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_orden_compra_number_key" ON "solicitudes_orden_compra"("number");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_orden_compra_purchase_id_key" ON "solicitudes_orden_compra"("purchase_id");

-- AddForeignKey
ALTER TABLE "solicitudes_orden_compra" ADD CONSTRAINT "solicitudes_orden_compra_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_orden_compra" ADD CONSTRAINT "solicitudes_orden_compra_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_orden_compra" ADD CONSTRAINT "solicitudes_orden_compra_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_orden_compra" ADD CONSTRAINT "solicitudes_orden_compra_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_orden_compra" ADD CONSTRAINT "solicitudes_orden_compra_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_orden_compra" ADD CONSTRAINT "solicitudes_orden_compra_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_items" ADD CONSTRAINT "solicitud_items_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
