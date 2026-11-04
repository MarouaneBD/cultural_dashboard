-- CreateEnum
CREATE TYPE "Pillar" AS ENUM ('EDUCATION', 'FAMILY_CULTURE', 'ISLAMIC_INFO_CENTER', 'AL_BIRR_MALE', 'AL_BIRR_FEMALE', 'ORPHANS', 'SCIENTIFIC_PROGRAMS');

-- CreateEnum
CREATE TYPE "KpiUnit" AS ENUM ('PERCENT', 'COUNT', 'CURRENCY');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Period" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL');

-- CreateTable
CREATE TABLE "KpiRegistry" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "unit" "KpiUnit" NOT NULL,
    "owner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "period" "Period" NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actual" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "period" "Period" NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "region" TEXT,
    "facility" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "status" "ProgramStatus" NOT NULL,
    "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budget" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "kpiId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiRegistry_nameAr_pillar_key" ON "KpiRegistry"("nameAr", "pillar");

-- CreateIndex
CREATE UNIQUE INDEX "Target_kpiId_period_year_key" ON "Target"("kpiId", "period", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Actual_kpiId_period_year_key" ON "Actual"("kpiId", "period", "year");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actual" ADD CONSTRAINT "Actual_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
