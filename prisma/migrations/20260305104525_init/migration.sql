-- CreateTable
CREATE TABLE "Motor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "location" TEXT,
    "dateOut" DATETIME,
    "dateIn" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pumpingHours" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SubComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "cumulativeHours" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "motorId" TEXT NOT NULL,
    "subComponentId" TEXT NOT NULL,
    "dateAssembled" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateRemoved" DATETIME,
    "hoursAtAssembly" REAL NOT NULL,
    "hoursAtRemoval" REAL,
    "hoursAccrued" REAL,
    CONSTRAINT "Assembly_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assembly_subComponentId_fkey" FOREIGN KEY ("subComponentId") REFERENCES "SubComponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HourLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "motorId" TEXT NOT NULL,
    "hoursAdded" REAL NOT NULL,
    "totalAfter" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HourLog_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Motor_serialNumber_key" ON "Motor"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SubComponent_serialNumber_key" ON "SubComponent"("serialNumber");

-- CreateIndex
CREATE INDEX "Assembly_motorId_dateRemoved_idx" ON "Assembly"("motorId", "dateRemoved");
