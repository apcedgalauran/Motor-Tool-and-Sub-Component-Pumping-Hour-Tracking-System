-- v2.7: Asset Category elevation + AssetStatus enum replacement
-- Two logical changes: (a) AssetCategory fields on SubComponent, (b) AssetStatus enum for Motor & SubComponent

-- ============================================================
-- 1. Create AssetCategory enum
-- ============================================================
CREATE TYPE "AssetCategory" AS ENUM ('STATOR', 'ROTOR', 'MOTOR_SLEEVE', 'OTHER');

-- ============================================================
-- 2. Create AssetStatus enum
-- ============================================================
CREATE TYPE "AssetStatus" AS ENUM (
  'ON_JOB', 'IN_SERVICE', 'RFF', 'WOP', 'USED',
  'THIRD_PARTY', 'LOST_IN_HOLE', 'SCRAP', 'TRANSFER',
  'IDLE', 'QUARANTINE'
);

-- ============================================================
-- 3. Add AssetCategory fields to SubComponent
-- ============================================================
ALTER TABLE "SubComponent"
  ADD COLUMN "assetCategory"      "AssetCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "sapId"              TEXT,
  ADD COLUMN "size"               TEXT,
  ADD COLUMN "configuration"      TEXT,
  ADD COLUMN "brand"              TEXT;

-- ============================================================
-- 4. Migrate Motor.status from old text to AssetStatus
-- ============================================================
-- Step A: Add a temporary nullable column typed as AssetStatus
ALTER TABLE "Motor" ADD COLUMN "status_new" "AssetStatus";

-- Step B: Map old text values to new enum values
UPDATE "Motor" SET "status_new" = CASE "status"
  WHEN 'ON_LOCATION'     THEN 'ON_JOB'::"AssetStatus"
  WHEN 'IN_BASE'         THEN 'IDLE'::"AssetStatus"
  WHEN 'FOR_MAINTENANCE' THEN 'IN_SERVICE'::"AssetStatus"
  ELSE 'IDLE'::"AssetStatus"
END;

-- Step C: Drop old column, set NOT NULL + default, rename
ALTER TABLE "Motor" DROP COLUMN "status";
ALTER TABLE "Motor" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "Motor" ALTER COLUMN "status_new" SET DEFAULT 'IDLE'::"AssetStatus";
ALTER TABLE "Motor" RENAME COLUMN "status_new" TO "status";

-- ============================================================
-- 5. Migrate SubComponent.status from free-text to AssetStatus
--    Old values: AVAILABLE, INSTALLED, ACTIVE, IN_MAINTENANCE, RETIRED
--    Split into: status (AssetStatus) + availabilityStatus (TEXT)
-- ============================================================
-- Step A: Add availabilityStatus column
ALTER TABLE "SubComponent" ADD COLUMN "availabilityStatus" TEXT NOT NULL DEFAULT 'AVAILABLE';

-- Step B: Populate availabilityStatus from old status values
--   Records with old status = 'INSTALLED' → availabilityStatus = 'INSTALLED'
--   All others → 'AVAILABLE' (already the default)
UPDATE "SubComponent" SET "availabilityStatus" = 'INSTALLED' WHERE "status" = 'INSTALLED';

-- Step C: Add a temporary nullable column typed as AssetStatus
ALTER TABLE "SubComponent" ADD COLUMN "status_new" "AssetStatus";

-- Step D: Map old text values to new enum values
UPDATE "SubComponent" SET "status_new" = CASE "status"
  WHEN 'ACTIVE'         THEN 'IDLE'::"AssetStatus"
  WHEN 'IN_MAINTENANCE' THEN 'IN_SERVICE'::"AssetStatus"
  WHEN 'RETIRED'        THEN 'SCRAP'::"AssetStatus"
  WHEN 'AVAILABLE'      THEN 'IDLE'::"AssetStatus"
  WHEN 'INSTALLED'      THEN 'IDLE'::"AssetStatus"
  ELSE 'IDLE'::"AssetStatus"
END;

-- Step E: Drop old column, set NOT NULL + default, rename
ALTER TABLE "SubComponent" DROP COLUMN "status";
ALTER TABLE "SubComponent" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "SubComponent" ALTER COLUMN "status_new" SET DEFAULT 'IDLE'::"AssetStatus";
ALTER TABLE "SubComponent" RENAME COLUMN "status_new" TO "status";

-- ============================================================
-- 6. Remove customStatusId from Motor (FK + column)
-- ============================================================
-- Drop the FK constraint first (if it exists)
DO $$
BEGIN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'Motor_customStatusId_fkey'
    ) THEN
      ALTER TABLE "Motor" DROP CONSTRAINT "Motor_customStatusId_fkey";
    END IF;
END $$;

ALTER TABLE "Motor" DROP COLUMN IF EXISTS "customStatusId";

-- ============================================================
-- 7. Add indexes
-- ============================================================
CREATE INDEX "SubComponent_assetCategory_idx" ON "SubComponent"("assetCategory");
CREATE INDEX "SubComponent_status_idx"        ON "SubComponent"("status");
CREATE INDEX "Motor_status_idx"               ON "Motor"("status");
