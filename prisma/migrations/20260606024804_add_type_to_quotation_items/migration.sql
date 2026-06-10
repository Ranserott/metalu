-- CreateEnum
CREATE TYPE "QuotationItemType" AS ENUM ('MATERIAL', 'WORK');

-- AlterTable
ALTER TABLE "quotation_items" ADD COLUMN     "type" "QuotationItemType" NOT NULL DEFAULT 'MATERIAL';
