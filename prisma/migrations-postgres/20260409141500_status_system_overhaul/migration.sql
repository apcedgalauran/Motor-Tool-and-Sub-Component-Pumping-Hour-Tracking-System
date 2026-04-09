-- Create custom status table used by permanent custom motor statuses.
CREATE TABLE IF NOT EXISTS "CustomStatus" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isPermanent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomStatus_pkey" PRIMARY KEY ("id")
);

-- Add optional relation column on motors.
ALTER TABLE "Motor"
ADD COLUMN IF NOT EXISTS "customStatusId" TEXT;

-- Convert enum-backed legacy values to the new string status model.
DO $$
DECLARE
    status_type text;
BEGIN
    SELECT data_type
      INTO status_type
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'Motor'
       AND column_name = 'status';

    IF status_type = 'USER-DEFINED' THEN
      ALTER TABLE "Motor"
      ALTER COLUMN "status" TYPE TEXT
      USING (
        CASE "status"::text
          WHEN 'ACTIVE' THEN 'ON_LOCATION'
          WHEN 'INACTIVE' THEN 'IN_BASE'
          WHEN 'IN_MAINTENANCE' THEN 'FOR_MAINTENANCE'
          ELSE COALESCE(NULLIF("status"::text, ''), 'ON_LOCATION')
        END
      );
    END IF;
END $$;

-- Data migration for databases that already store legacy text values.
UPDATE "Motor" SET "status" = 'ON_LOCATION' WHERE "status" = 'ACTIVE';
UPDATE "Motor" SET "status" = 'IN_BASE' WHERE "status" = 'INACTIVE';
UPDATE "Motor" SET "status" = 'FOR_MAINTENANCE' WHERE "status" = 'IN_MAINTENANCE';

ALTER TABLE "Motor"
ALTER COLUMN "status" SET DEFAULT 'ON_LOCATION';

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'Motor_customStatusId_fkey'
    ) THEN
      ALTER TABLE "Motor"
      ADD CONSTRAINT "Motor_customStatusId_fkey"
      FOREIGN KEY ("customStatusId")
      REFERENCES "CustomStatus"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CustomStatus_label_key" ON "CustomStatus"("label");

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MotorStatus') THEN
      BEGIN
        EXECUTE 'DROP TYPE "MotorStatus"';
      EXCEPTION
        WHEN dependent_objects_still_exist THEN
          NULL;
      END;
    END IF;
END $$;