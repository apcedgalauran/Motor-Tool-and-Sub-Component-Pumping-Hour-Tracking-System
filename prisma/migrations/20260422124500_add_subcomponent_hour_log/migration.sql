-- CreateTable
CREATE TABLE "SubComponentHourLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subComponentId" TEXT NOT NULL,
    "motorId" TEXT,
    "userId" TEXT NOT NULL,
    "hoursAdded" REAL NOT NULL,
    "totalAfter" REAL NOT NULL,
    "rigName" TEXT NOT NULL,
    "wellNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubComponentHourLog_subComponentId_fkey" FOREIGN KEY ("subComponentId") REFERENCES "SubComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubComponentHourLog_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SubComponentHourLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SubComponentHourLog_subComponentId_createdAt_idx" ON "SubComponentHourLog"("subComponentId", "createdAt");

-- CreateIndex
CREATE INDEX "SubComponentHourLog_motorId_createdAt_idx" ON "SubComponentHourLog"("motorId", "createdAt");

-- CreateIndex
CREATE INDEX "SubComponentHourLog_userId_createdAt_idx" ON "SubComponentHourLog"("userId", "createdAt");
