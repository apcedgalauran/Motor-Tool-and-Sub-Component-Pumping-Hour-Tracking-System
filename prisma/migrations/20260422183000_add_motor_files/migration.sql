-- CreateTable
CREATE TABLE "MotorFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "motorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MotorFile_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MotorFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MotorFile_motorId_createdAt_idx" ON "MotorFile"("motorId", "createdAt");

-- CreateIndex
CREATE INDEX "MotorFile_uploadedBy_createdAt_idx" ON "MotorFile"("uploadedBy", "createdAt");
