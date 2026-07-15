-- Rename WorkOrderStatus.QUALITY_CHECK to DRAFT.
-- Postgres cannot ALTER an existing enum value, so we recreate the type:
--   1. add the new DRAFT value
--   2. migrate any QUALITY_CHECK rows to DRAFT
--   3. swap to a fresh enum that omits QUALITY_CHECK
--   4. drop the old enum

ALTER TYPE "WorkOrderStatus" ADD VALUE 'DRAFT' BEFORE 'TODO';

UPDATE "work_orders"
SET   "status" = 'DRAFT'
WHERE "status" = 'QUALITY_CHECK';

CREATE TYPE "WorkOrderStatus_new" AS ENUM ('DRAFT', 'TODO', 'IN_PROGRESS', 'COMPLETED');

ALTER TABLE "work_orders"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "WorkOrderStatus_new"
    USING ("status"::text::"WorkOrderStatus_new");

ALTER TABLE "work_orders"
  ALTER COLUMN "status" SET DEFAULT 'TODO'::"WorkOrderStatus_new";

DROP TYPE "WorkOrderStatus";

ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";