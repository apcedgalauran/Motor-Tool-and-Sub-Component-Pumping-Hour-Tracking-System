-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MotorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'IN_MAINTENANCE');

-- CreateTable
CREATE TABLE "Motor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "location" TEXT,
    "dateOut" TIMESTAMP(3),
    "dateIn" TIMESTAMP(3),
    "status" "MotorStatus" NOT NULL DEFAULT 'ACTIVE',
    "pumpingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubComponent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "cumulativeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL,
    "motorId" TEXT NOT NULL,
    "subComponentId" TEXT NOT NULL,
    "dateAssembled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateRemoved" TIMESTAMP(3),
    "hoursAtAssembly" DOUBLE PRECISION NOT NULL,
    "hoursAtRemoval" DOUBLE PRECISION,
    "hoursAccrued" DOUBLE PRECISION,

    CONSTRAINT "Assembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourLog" (
    "id" TEXT NOT NULL,
    "motorId" TEXT NOT NULL,
    "hoursAdded" DOUBLE PRECISION NOT NULL,
    "totalAfter" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "rigName" TEXT,
    "wellNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HourLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Motor_serialNumber_key" ON "Motor"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubComponent_serialNumber_key" ON "SubComponent"("serialNumber");

-- CreateIndex
CREATE INDEX "Assembly_motorId_dateRemoved_idx" ON "Assembly"("motorId", "dateRemoved");

-- AddForeignKey
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_subComponentId_fkey" FOREIGN KEY ("subComponentId") REFERENCES "SubComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourLog" ADD CONSTRAINT "HourLog_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourLog" ADD CONSTRAINT "HourLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
