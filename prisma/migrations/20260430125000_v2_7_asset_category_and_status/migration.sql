-- v2.7: Asset Category elevation + AssetStatus replacement (SQLite track)
-- SQLite does not support ALTER COLUMN, so table rebuilds are required.

-- ============================================================
-- RedefineTables
-- ============================================================
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ============================================================
-- 1. Rebuild Motor table
--    - status: map old text values to new AssetStatus values
--    - customStatusId: REMOVED
-- ============================================================
CREATE TABLE "new_Motor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "location" TEXT,
    "dateOut" DATETIME,
    "dateIn" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "pumpingHours" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Motor" ("id", "name", "serialNumber", "location", "dateOut", "dateIn", "status", "pumpingHours", "createdAt", "updatedAt")
SELECT "id", "name", "serialNumber", "location", "dateOut", "dateIn",
    CASE "status"
        WHEN 'ON_LOCATION'     THEN 'IDLE'
        WHEN 'IN_BASE'         THEN 'IDLE'
        WHEN 'FOR_MAINTENANCE' THEN 'IN_SERVICE'
        ELSE 'IDLE'
    END,
    "pumpingHours", "createdAt", "updatedAt"
FROM "Motor";

DROP TABLE "Motor";
ALTER TABLE "new_Motor" RENAME TO "Motor";
CREATE UNIQUE INDEX "Motor_serialNumber_key" ON "Motor"("serialNumber");

-- ============================================================
-- 2. Rebuild SubComponent table
--    - status: map old text values to new AssetStatus values
--    - availabilityStatus: new column, derived from old status
--    - assetCategory, sapId, size, configuration, brand: new columns
-- ============================================================
CREATE TABLE "new_SubComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "cumulativeHours" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "availabilityStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "assetCategory" TEXT NOT NULL DEFAULT 'OTHER',
    "sapId" TEXT,
    "size" TEXT,
    "configuration" TEXT,
    "brand" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_SubComponent" ("id", "type", "serialNumber", "cumulativeHours", "status", "availabilityStatus", "assetCategory", "notes", "createdAt", "updatedAt")
SELECT "id", "type", "serialNumber", "cumulativeHours",
    CASE "status"
        WHEN 'ACTIVE'         THEN 'IDLE'
        WHEN 'IN_MAINTENANCE' THEN 'IN_SERVICE'
        WHEN 'RETIRED'        THEN 'SCRAP'
        WHEN 'AVAILABLE'      THEN 'IDLE'
        WHEN 'INSTALLED'      THEN 'IDLE'
        ELSE 'IDLE'
    END,
    CASE "status"
        WHEN 'INSTALLED' THEN 'INSTALLED'
        ELSE 'AVAILABLE'
    END,
    'OTHER',
    "notes", "createdAt", "updatedAt"
FROM "SubComponent";

DROP TABLE "SubComponent";
ALTER TABLE "new_SubComponent" RENAME TO "SubComponent";
CREATE UNIQUE INDEX "SubComponent_serialNumber_key" ON "SubComponent"("serialNumber");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- ============================================================
-- 3. Create indexes
-- ============================================================
CREATE INDEX "SubComponent_assetCategory_idx" ON "SubComponent"("assetCategory");
CREATE INDEX "SubComponent_status_idx" ON "SubComponent"("status");
CREATE INDEX "Motor_status_idx" ON "Motor"("status");
