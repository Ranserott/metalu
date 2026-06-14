-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "encargado_id" TEXT;

-- CreateTable
CREATE TABLE "encargados" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "client_id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "encargados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "encargados_rut_key" ON "encargados"("rut");

-- AddForeignKey
ALTER TABLE "encargados" ADD CONSTRAINT "encargados_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encargados" ADD CONSTRAINT "encargados_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_encargado_id_fkey" FOREIGN KEY ("encargado_id") REFERENCES "encargados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
