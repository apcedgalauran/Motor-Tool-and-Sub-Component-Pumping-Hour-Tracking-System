-- CreateTable
CREATE TABLE "MotorEditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "motorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedFields" JSONB NOT NULL,
    CONSTRAINT "MotorEditLog_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MotorEditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MotorEditLog_motorId_editedAt_idx" ON "MotorEditLog"("motorId", "editedAt");

-- CreateIndex
CREATE INDEX "MotorEditLog_userId_editedAt_idx" ON "MotorEditLog"("userId", "editedAt");
