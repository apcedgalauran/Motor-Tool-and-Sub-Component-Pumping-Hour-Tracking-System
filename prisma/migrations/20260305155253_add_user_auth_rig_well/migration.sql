-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HourLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "motorId" TEXT NOT NULL,
    "hoursAdded" REAL NOT NULL,
    "totalAfter" REAL NOT NULL,
    "userId" TEXT,
    "rigName" TEXT,
    "wellNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HourLog_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HourLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HourLog" ("createdAt", "hoursAdded", "id", "motorId", "notes", "totalAfter") SELECT "createdAt", "hoursAdded", "id", "motorId", "notes", "totalAfter" FROM "HourLog";
DROP TABLE "HourLog";
ALTER TABLE "new_HourLog" RENAME TO "HourLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
