CREATE TABLE IF NOT EXISTS "MotorEditLog" (
    "id" TEXT NOT NULL,
    "motorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedFields" JSONB NOT NULL,
    CONSTRAINT "MotorEditLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'MotorEditLog_motorId_fkey'
    ) THEN
      ALTER TABLE "MotorEditLog"
      ADD CONSTRAINT "MotorEditLog_motorId_fkey"
      FOREIGN KEY ("motorId")
      REFERENCES "Motor"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'MotorEditLog_userId_fkey'
    ) THEN
      ALTER TABLE "MotorEditLog"
      ADD CONSTRAINT "MotorEditLog_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MotorEditLog_motorId_editedAt_idx" ON "MotorEditLog"("motorId", "editedAt");
CREATE INDEX IF NOT EXISTS "MotorEditLog_userId_editedAt_idx" ON "MotorEditLog"("userId", "editedAt");