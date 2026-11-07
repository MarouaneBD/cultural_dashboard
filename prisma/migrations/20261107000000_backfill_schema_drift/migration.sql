-- Migration: backfill_schema_drift
-- Brings the schema fully in line with schema.prisma (2026-11-07).
--
-- Coverage (relative to 20260610190755_init):
--   • Pillar: 6 missing values (3 from migration 2 + 3 new)
--   • New enums: ActivityType, SubmissionStatus, RowStatus
--   • KpiRegistry: slug, activityType, showInDashboard columns
--   • User: passwordResetRequested, assignedPillarId columns
--   • New tables: UploadSubmission, SubmissionRow, Comment
--   • Missing indexes on Target, Actual, AuditLog + all new-table indexes
--
-- All enum ADD VALUE statements use IF NOT EXISTS so this migration is safe
-- whether migration 20261020174248_add_institutional_support_pillars was
-- applied previously or not.

-- ── Pillar: add missing values ────────────────────────────────────────────────

ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS 'HR_MANAGEMENT';
ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS 'ADMIN_AFFAIRS';
ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS 'PROCUREMENT';
ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS 'RESEARCH_PUBLICATIONS';
ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS 'DEVELOPMENT_PROJECTS';
ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS 'ZAKAT_MANAGEMENT';

-- ── New enums ─────────────────────────────────────────────────────────────────

CREATE TYPE "ActivityType" AS ENUM ('CUMULATIVE', 'MONTHLY_VARIANCE');
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISMISSED');

-- ── KpiRegistry: new columns ──────────────────────────────────────────────────

ALTER TABLE "KpiRegistry" ADD COLUMN "slug" TEXT;
ALTER TABLE "KpiRegistry" ADD COLUMN "activityType" "ActivityType" NOT NULL DEFAULT 'MONTHLY_VARIANCE';
ALTER TABLE "KpiRegistry" ADD COLUMN IF NOT EXISTS "showInDashboard" BOOLEAN NOT NULL DEFAULT false;

-- ── User: new columns ─────────────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN "passwordResetRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "assignedPillarId" TEXT;

-- ── New tables ────────────────────────────────────────────────────────────────

CREATE TABLE "UploadSubmission" (
    "id"          TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "filename"    TEXT NOT NULL,
    "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"      "SubmissionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "UploadSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionRow" (
    "id"           TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "kpiId"        TEXT NOT NULL,
    "kpiNameAr"    TEXT NOT NULL,
    "period"       "Period" NOT NULL,
    "year"         INTEGER NOT NULL,
    "newValue"     DOUBLE PRECISION NOT NULL,
    "oldValue"     DOUBLE PRECISION NOT NULL,
    "tableType"    TEXT NOT NULL,
    "status"       "RowStatus" NOT NULL DEFAULT 'PENDING',
    "adminComment" TEXT,
    "reviewedAt"   TIMESTAMP(3),
    "reviewedBy"   TEXT,

    CONSTRAINT "SubmissionRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comment" (
    "id"        TEXT NOT NULL,
    "pillarId"  TEXT NOT NULL,
    "text"      TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- ── Foreign keys ──────────────────────────────────────────────────────────────

ALTER TABLE "UploadSubmission"
    ADD CONSTRAINT "UploadSubmission_submitterId_fkey"
    FOREIGN KEY ("submitterId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubmissionRow"
    ADD CONSTRAINT "SubmissionRow_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "UploadSubmission"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Indexes: existing tables ──────────────────────────────────────────────────

CREATE INDEX "Target_kpiId_idx"             ON "Target"("kpiId");
CREATE INDEX "Target_kpiId_year_period_idx" ON "Target"("kpiId", "year", "period");

CREATE INDEX "Actual_kpiId_idx"             ON "Actual"("kpiId");
CREATE INDEX "Actual_kpiId_year_period_idx" ON "Actual"("kpiId", "year", "period");

CREATE INDEX "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_kpiId_idx"     ON "AuditLog"("kpiId");

-- ── Indexes: new tables ───────────────────────────────────────────────────────

CREATE INDEX "UploadSubmission_submitterId_idx" ON "UploadSubmission"("submitterId");
CREATE INDEX "UploadSubmission_status_idx"      ON "UploadSubmission"("status");

CREATE INDEX "SubmissionRow_submissionId_idx"  ON "SubmissionRow"("submissionId");
CREATE INDEX "SubmissionRow_status_idx"        ON "SubmissionRow"("status");
CREATE INDEX "SubmissionRow_kpiId_period_year_idx" ON "SubmissionRow"("kpiId", "period", "year");

CREATE INDEX "Comment_pillarId_idx" ON "Comment"("pillarId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
