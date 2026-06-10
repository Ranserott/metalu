-- CreateEnum
CREATE TYPE "QuotationDiscountType" AS ENUM ('NONE', 'AMOUNT', 'PERCENT');

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "discount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "discount_type" "QuotationDiscountType" NOT NULL DEFAULT 'NONE';
