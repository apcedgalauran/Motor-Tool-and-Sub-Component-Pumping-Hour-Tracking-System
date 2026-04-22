CREATE TABLE IF NOT EXISTS "MotorFile" (
    "id" TEXT NOT NULL,
    "motorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MotorFile_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'MotorFile_motorId_fkey'
    ) THEN
      ALTER TABLE "MotorFile"
      ADD CONSTRAINT "MotorFile_motorId_fkey"
      FOREIGN KEY ("motorId")
      REFERENCES "Motor"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'MotorFile_uploadedBy_fkey'
    ) THEN
      ALTER TABLE "MotorFile"
      ADD CONSTRAINT "MotorFile_uploadedBy_fkey"
      FOREIGN KEY ("uploadedBy")
      REFERENCES "User"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MotorFile_motorId_createdAt_idx" ON "MotorFile"("motorId", "createdAt");
CREATE INDEX IF NOT EXISTS "MotorFile_uploadedBy_createdAt_idx" ON "MotorFile"("uploadedBy", "createdAt");
