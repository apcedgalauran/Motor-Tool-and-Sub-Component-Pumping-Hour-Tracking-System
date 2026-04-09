-- CreateTable
CREATE TABLE "CustomStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isPermanent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Motor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "location" TEXT,
    "dateOut" DATETIME,
    "dateIn" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ON_LOCATION',
    "customStatusId" TEXT,
    "pumpingHours" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Motor_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "CustomStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Motor" ("createdAt", "dateIn", "dateOut", "id", "location", "name", "pumpingHours", "serialNumber", "status", "updatedAt") SELECT "createdAt", "dateIn", "dateOut", "id", "location", "name", "pumpingHours", "serialNumber", "status", "updatedAt" FROM "Motor";
DROP TABLE "Motor";
ALTER TABLE "new_Motor" RENAME TO "Motor";
CREATE UNIQUE INDEX "Motor_serialNumber_key" ON "Motor"("serialNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustomStatus_label_key" ON "CustomStatus"("label");
