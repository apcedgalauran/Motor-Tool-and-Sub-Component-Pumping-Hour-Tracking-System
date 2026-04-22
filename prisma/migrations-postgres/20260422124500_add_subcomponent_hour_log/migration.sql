CREATE TABLE IF NOT EXISTS "SubComponentHourLog" (
    "id" TEXT NOT NULL,
    "subComponentId" TEXT NOT NULL,
    "motorId" TEXT,
    "userId" TEXT NOT NULL,
    "hoursAdded" DOUBLE PRECISION NOT NULL,
    "totalAfter" DOUBLE PRECISION NOT NULL,
    "rigName" TEXT NOT NULL,
    "wellNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubComponentHourLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'SubComponentHourLog_subComponentId_fkey'
    ) THEN
      ALTER TABLE "SubComponentHourLog"
      ADD CONSTRAINT "SubComponentHourLog_subComponentId_fkey"
      FOREIGN KEY ("subComponentId")
      REFERENCES "SubComponent"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'SubComponentHourLog_motorId_fkey'
    ) THEN
      ALTER TABLE "SubComponentHourLog"
      ADD CONSTRAINT "SubComponentHourLog_motorId_fkey"
      FOREIGN KEY ("motorId")
      REFERENCES "Motor"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'SubComponentHourLog_userId_fkey'
    ) THEN
      ALTER TABLE "SubComponentHourLog"
      ADD CONSTRAINT "SubComponentHourLog_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SubComponentHourLog_subComponentId_createdAt_idx" ON "SubComponentHourLog"("subComponentId", "createdAt");
CREATE INDEX IF NOT EXISTS "SubComponentHourLog_motorId_createdAt_idx" ON "SubComponentHourLog"("motorId", "createdAt");
CREATE INDEX IF NOT EXISTS "SubComponentHourLog_userId_createdAt_idx" ON "SubComponentHourLog"("userId", "createdAt");
