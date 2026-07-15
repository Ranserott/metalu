-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "parent_client_id" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "razon_social_snapshot" TEXT,
ADD COLUMN     "rut_snapshot" TEXT;

-- AlterTable
ALTER TABLE "work_orders" ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "clients_parent_client_id_idx" ON "clients"("parent_client_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_parent_client_id_fkey" FOREIGN KEY ("parent_client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
