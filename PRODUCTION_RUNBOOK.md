# Production Deployment Runbook
## Cultural Dashboard — Application Candidate `b06e486`

**Prepared:** 2026-11-07  
**Runbook revision:** `f6410ec` (documentation-only commit on top of `b06e486`)  
**Status:** PENDING sign-off (see Section 5)

---

## How to use this document

Work through sections 1–5 in order. Each step lists: the **action**, the **expected result**, and a **stop condition** (⛔) that must halt the deployment and trigger investigation. Steps marked `[PLACEHOLDER]` require infrastructure details the operator must supply before proceeding.

---

## 1. Release Scope and Preflight

### 1.1 Release identity

| Field | Value |
|---|---|
| **Tested application candidate** | `b06e48661fee147fdb2e1b95970ff87f4828d5ec` |
| **Runbook revision** | `f6410ec6316b53ae3c67029c87c59f53be60126f` |
| Branch | `main` (worktree: `worktree-fix+remediation-2dfd8da`) |
| Merge base | `2dfd8da` (last commit before remediation) |
| Migration file | `prisma/migrations/20261107000000_backfill_schema_drift/migration.sql` |
| Reporting year | 2026 (`lib/config.ts` — `REPORTING_YEAR = 2026`) |
| Node runtime | nodejs (all routes — `export const runtime = 'nodejs'`) |

**Commit relationship.** `f6410ec` is the tip of the branch and contains this runbook file. `b06e486` is the tested application candidate — the last commit that modifies source code. The diff between them is a single documentation-only file addition (`PRODUCTION_RUNBOOK.md`). No application source, migration SQL, test, or configuration file changed between the two commits.

**Deployment artifact rule.** The artifact or checkout deployed to production must correspond to `b06e48661fee147fdb2e1b95970ff87f4828d5ec` or `f6410ec6316b53ae3c67029c87c59f53be60126f`. If your platform builds from a source checkout, either SHA is acceptable; `f6410ec` is preferred as it includes this runbook. If the platform builds from a container image or archive, verify the image digest or archive checksum is derived from one of these two SHAs and record it in V1 before proceeding.

```bash
# On the deployment host, after checkout, confirm the SHA
git rev-parse HEAD
# Acceptable: b06e48661fee147fdb2e1b95970ff87f4828d5ec
#         or: f6410ec6316b53ae3c67029c87c59f53be60126f
# Any other SHA is NOT acceptable — stop and investigate.
```

⛔ **Stop if the deployed SHA is anything other than one of the two values above.**

### 1.2 Changes in this release

| Commit | Summary |
|---|---|
| `ce8289f` | SECURITY: Block EDITOR from creating new KPI registry entries |
| `6cd7633` | SECURITY: Atomic approve/reject/approve-all (TOCTOU fix) |
| `8c2a90e` | DOCS: Align CLAUDE.md thresholds with implementation (85/70) |
| `ed26964` | TEST: Document take:500 KPI query limit |
| `6e95b1a` | MIGRATION: Forward migration for all schema drift |
| `b06e486` | CHORE: Lint cleanup |

### 1.3 Previous version for application rollback

| Field | Value |
|---|---|
| Rollback target commit | `2dfd8da` |
| Rollback target summary | Last stable commit before remediation branch |

**Compatibility note:** The previous app version (`2dfd8da`) does not reference `UploadSubmission`, `SubmissionRow`, or `Comment` tables — it predates the approval queue feature. It can run against the migrated schema without errors, but approval-queue routes will be absent. See Section 4 for rollback detail.

### 1.4 Required access

| Access | Who needs it | Purpose |
|---|---|---|
| DB superuser / migration role | Operator | Run `prisma migrate deploy`, take backup |
| Application deploy access | Operator | Deploy new build, restart app |
| Admin account on application | QA / operator | Run smoke tests post-deploy |
| A test EDITOR account with `assignedPillarId` set | QA | EDITOR upload smoke tests |

### 1.5 Required environment variable names

The following variables must be set in the production environment. **Never record secret values in this document.**

| Variable | Purpose | Required for |
|---|---|---|
| `DATABASE_URL` | Application DB connection (pooler, e.g. `pgbouncer=true`) | App runtime |
| `SESSION_URL` | Direct DB connection for migrations (overrides `DATABASE_URL` in `prisma.config.ts`) | `prisma migrate deploy` |
| `DIRECT_URL` | Fallback direct connection | Migrations if `SESSION_URL` absent |
| `AUTH_SECRET` | NextAuth JWT signing key | App runtime — **must be set or login fails** |
| `POSTGRES_PASSWORD` | Docker Compose DB password | Local / staging only |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false` only for managed services with self-signed certs | Conditional |
| `NODE_ENV` | Must be `production` in prod | App runtime |

**Verify before deploy:**

```bash
# Run against the production app's /api/health endpoint after deploy
# Expected: {"status":"ok","db":"ok","env":{"AUTH_SECRET":"set","DATABASE_URL":"set",...}}
curl -s https://[PLACEHOLDER:app-hostname]/api/health | python3 -m json.tool
```

⛔ **Stop if `AUTH_SECRET` or `DATABASE_URL` is `"MISSING"` in the health response.**

### 1.6 What was verified on disposable PostgreSQL vs. what still needs production confirmation

| Check | Verified on disposable DB | Needs production confirmation |
|---|---|---|
| All 3 migrations apply cleanly to a fresh DB | ✓ VERIFIED | — |
| Upgrade path (deployed state → migrate 2+3) preserves 75 KPIs, 69 targets, 146 actuals | ✓ VERIFIED on a copy | Operator must confirm backup taken and restore tested (Step 2.3) |
| EDITOR novel KPI rejected, no live registry entry | ✓ VERIFIED (Jest + integration) | Smoke test in production (Step 3.3) |
| TOCTOU race: concurrent approve+approve yields count=0 | ✓ VERIFIED (Jest + integration) | — |
| App builds and type-checks clean | ✓ VERIFIED | — |
| Login rate-limiter persists across restarts (in-memory Map) | NOT TESTED | Known limitation for multi-instance; irrelevant for single-instance |
| `take:500` query cap does not truncate production KPI set | Volume < 500 assumed | **Operator must confirm production KPI count (Step 5.3)** |
| Health endpoint reachable at `/api/health` | ✓ Endpoint exists | Confirm TLS and routing in production |

---

## 2. Database Baseline and Migration

### 2.1 Read-only checks — establish production baseline

**Step 2.1.1 — Connect to the production database (read-only). Do not modify anything.**

```bash
# Substitute production connection details
psql "$PRODUCTION_DATABASE_URL" --no-psqlrc
```

**Step 2.1.2 — Check Prisma migration history**

```sql
-- If this table exists, Prisma migrations have been used
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;
```

**Two cases:**

**Case A — Table exists and shows migrations applied:**

Expected output (a database that received all three migrations):
```
         migration_name                  |        finished_at         | rolled_back_at
-----------------------------------------+----------------------------+----------------
 20260610190755_init                     | 2026-xx-xx xx:xx:xx.xxx+00 |
 20261020174248_add_institutional_support_pillars | 2026-xx-xx ... |
 20261107000000_backfill_schema_drift    | (null — not yet applied)   |
```

If migration `20261107000000_backfill_schema_drift` already appears with a `finished_at`, this release has already been deployed. Verify before proceeding.

⛔ **Stop if any migration shows a non-null `rolled_back_at` — a previous migration was rolled back; investigate before proceeding.**

**Case B — Table does not exist (database was created with `db push`):**

```
ERROR:  relation "_prisma_migrations" does not exist
```

This matches the rehearsed baseline. Continue to Step 2.2.

**Step 2.1.3 — Confirm Pillar enum values in production**

```sql
SELECT e.enumlabel AS pillar_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'Pillar'
ORDER BY e.enumsortorder;
```

**Expected for a db-push baseline (matches rehearsed state):** 7 values —
`EDUCATION, FAMILY_CULTURE, ISLAMIC_INFO_CENTER, AL_BIRR_MALE, AL_BIRR_FEMALE, ORPHANS, SCIENTIFIC_PROGRAMS`

**Expected for a migrations-applied baseline:** 10 values — above 7 plus `HR_MANAGEMENT, ADMIN_AFFAIRS, PROCUREMENT`

⛔ **Stop if the production value set differs from either of these two states — investigate before classifying which path to follow.**

**Step 2.1.4 — Check which new tables already exist**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('UploadSubmission','SubmissionRow','Comment')
ORDER BY table_name;
```

Expected: 0 rows (new tables not yet present). If any appear, the migration may have been partially applied — investigate before proceeding.

**Step 2.1.5 — Record production KPI count**

```sql
SELECT count(*) AS kpi_count FROM "KpiRegistry";
```

Record this number. It is needed for Section 5.3 (take:500 sign-off) and for post-migration verification (Section 2.5).

---

### 2.1.6 — STOP-M1: Baseline verification gate

**Run this check before any migration command and before marking any migration as applied. It is a hard gate — not optional.**

The migration rehearsal was performed against a specific baseline. Record the following facts from the production database using the checks above, then compare each against the rehearsed values:

| Evidence item | Rehearsed value | Observed production value | Match? |
|---|---|---|---|
| `_prisma_migrations` table exists? | No (db-push baseline) | _record here_ | — |
| Table count (public schema) | 6 (`Actual, AuditLog, KpiRegistry, Program, Target, User`) | _record here_ | — |
| `Pillar` enum count | 7 (db-push baseline) OR 10 (if migrations 1+2 were previously applied) | _record here_ | — |
| `User.assignedPillarId` column exists? | No | _record here_ | — |
| `KpiRegistry.activityType` column exists? | No | _record here_ | — |
| `UploadSubmission` table exists? | No | _record here_ | — |
| `SubmissionRow` table exists? | No | _record here_ | — |
| `Comment` table exists? | No | _record here_ | — |

**What "match" means:**

- `_prisma_migrations` absent and 7 Pillar values → matches rehearsed Case B (db-push). Proceed to 2.2 Case B.
- `_prisma_migrations` present and 7 or 10 Pillar values → matches Case A. Proceed to 2.2 Case A.
- Any of the new tables already present → migration may have been partially applied previously. Stop and investigate.
- `User.assignedPillarId` already present → schema was modified outside migrations. Stop and investigate.
- Table count ≠ 6 (excluding `_prisma_migrations`) → unknown additions. Stop and investigate.

⛔ **STOP-M1: If ANY observed value does not match a known rehearsed state, stop here. Do not mark any migration as applied. Do not run `prisma migrate deploy`. Investigate and obtain written sign-off from the operator before proceeding. The rehearsal guarantees safe migration only from the two confirmed baseline states.**

Record the baseline evidence and confirm match in V-BL (Section 5.4).

---

### 2.2 Migration path selection

**Case A: `_prisma_migrations` table exists**

The migration tool tracks history. Skip to Step 2.3.

**Case B: `_prisma_migrations` table does not exist**

The database was created with `prisma db push`. The rehearsed upgrade path applies:

**Before marking any migration as applied, verify the schema matches the `init` migration exactly:**

The production schema must have:
- Tables: `Actual, AuditLog, KpiRegistry, Program, Target, User` (exactly 6; none of the new tables)
- `Pillar` enum: 7 values (init state) OR 10 values (if `add_institutional_support_pillars` changes were pushed via `db push`)
- `User` table columns: `id, username, name, passwordHash, role, mustChangePassword, createdAt` (no `assignedPillarId`, no `passwordResetRequested`)
- `KpiRegistry` columns: `id, nameAr, pillar, unit, owner, createdAt` (no `slug`, no `activityType`)

```sql
-- Quick schema parity check for Case B
SELECT column_name FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;
-- Expected: id, username, name, passwordHash, role, mustChangePassword, createdAt
-- (must NOT contain assignedPillarId or passwordResetRequested)
```

⛔ **If the production schema does not match one of the two known baseline states, stop and investigate. Do not mark any migration as applied until you understand the actual state.**

If production schema matches and Pillar has 7 values, mark only `init` as applied and deploy migrations 2 + 3:

```bash
# Mark init as applied (schema already matches it — no SQL executed)
SESSION_URL="$PRODUCTION_SESSION_URL" npx prisma migrate resolve \
  --applied 20260610190755_init
```

If Pillar already has 10 values (migration 2 was pushed via `db push`), also mark migration 2:

```bash
SESSION_URL="$PRODUCTION_SESSION_URL" npx prisma migrate resolve \
  --applied 20261020174248_add_institutional_support_pillars
```

Then deploy remaining migrations (Step 2.4).

---

### 2.3 Backup and restore verification

**Take the backup before touching any schema. No exceptions.**

```bash
# [PLACEHOLDER: adjust container name, host, credentials]
pg_dump \
  --host=[PLACEHOLDER:db-host] \
  --port=5432 \
  --username=ers_user \
  --dbname=ers_db \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="ers_db_$(date +%Y%m%d_%H%M%S)_pre_b06e486.pgdump"
```

**Verify the backup is valid before proceeding:**

```bash
# Restore to a throwaway DB to confirm backup integrity
createdb ers_restore_verify
pg_restore \
  --host=[PLACEHOLDER:db-host] \
  --username=ers_user \
  --dbname=ers_restore_verify \
  --no-owner \
  --format=custom \
  ers_db_<timestamp>_pre_b06e486.pgdump

# Verify row counts match production
psql -U ers_user -d ers_restore_verify -c "
  SELECT 'users' AS t, count(*) FROM \"User\"
  UNION ALL SELECT 'kpis', count(*) FROM \"KpiRegistry\"
  UNION ALL SELECT 'targets', count(*) FROM \"Target\"
  UNION ALL SELECT 'actuals', count(*) FROM \"Actual\";"

# Drop the restore DB
dropdb ers_restore_verify
```

⛔ **Stop if the restore fails or row counts do not match production. Do not proceed with migration until backup integrity is confirmed.**

---

### 2.4 Apply the forward migration

```bash
# Run from the application root with production credentials
# SESSION_URL / DIRECT_URL is used by prisma.config.ts for migrations
SESSION_URL="$PRODUCTION_SESSION_URL" npx prisma migrate deploy
```

**Expected output:**

```
3 migrations found in prisma/migrations

Applying migration `20261107000000_backfill_schema_drift`

All migrations have been successfully applied.
```

(Migrations 1 and 2 appear as already applied; only migration 3 runs.)

⛔ **Stop if the command exits non-zero or reports a migration error. Do not deploy the application build.**

---

### 2.5 Post-migration schema verification

Run these checks immediately after migration, before deploying the app:

```sql
-- 1. All 13 Pillar values present
SELECT count(*) AS pillar_count
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'Pillar';
-- Expected: 13

-- 2. New enums exist
SELECT typname FROM pg_type
WHERE typname IN ('ActivityType','SubmissionStatus','RowStatus')
ORDER BY typname;
-- Expected: 3 rows

-- 3. New tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('UploadSubmission','SubmissionRow','Comment')
ORDER BY table_name;
-- Expected: 3 rows

-- 4. User.assignedPillarId present
SELECT column_name FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'assignedPillarId';
-- Expected: 1 row

-- 5. KpiRegistry.activityType present
SELECT column_name FROM information_schema.columns
WHERE table_name = 'KpiRegistry' AND column_name = 'activityType';
-- Expected: 1 row

-- 6. Data survived (compare against baseline recorded in Step 2.1.5)
SELECT 'kpis' AS t, count(*) FROM "KpiRegistry"
UNION ALL SELECT 'targets', count(*) FROM "Target"
UNION ALL SELECT 'actuals', count(*) FROM "Actual"
UNION ALL SELECT 'users', count(*) FROM "User";
-- Expected: row counts must equal pre-migration counts
```

⛔ **Stop if any check fails. If row counts decreased, halt and begin recovery (Section 4.2).**

---

## 3. Deploy and Verify

### 3.1 Deployment sequence

No CI/CD pipeline was detected in the repository (no `.github/workflows/`). Deploy using your infrastructure's standard method. Adapt the following sequence to your platform:

```bash
# Step 1: Check out the release commit on the deployment host
git fetch origin
git checkout b06e48661fee147fdb2e1b95970ff87f4828d5ec

# Step 2: Install dependencies (skips devDependencies in production)
npm ci --omit=dev

# Step 3: Generate Prisma client for the new schema
npx prisma generate

# Step 4: Build the Next.js application
npm run build
# Expected: "✓ Compiled successfully" with no errors

# Step 5: [PLACEHOLDER] Restart / swap in the new application instance
# Examples (choose the one that matches your infrastructure):
#   pm2 restart cultural-dashboard
#   systemctl restart cultural-dashboard
#   docker compose up -d --force-recreate app
#   [PLACEHOLDER: serverless/PaaS deploy command]

# Step 6: Confirm health endpoint is responding
curl -sf https://[PLACEHOLDER:app-hostname]/api/health
# Expected JSON: {"status":"ok","db":"ok","env":{"AUTH_SECRET":"set","DATABASE_URL":"set",...}}
```

⛔ **Stop if build exits non-zero, health check returns non-200, or `db` field is `"error"`.**

---

### 3.2 Smoke test prerequisites

Before running smoke tests:

1. Identify or create two test accounts:
   - **Admin account** (`role: ADMIN`) — can be an existing account; do not use a shared production credential
   - **Editor account** (`role: EDITOR`, `assignedPillarId` set to a known pillar, e.g. `EDUCATION`)

2. Identify one **existing KPI** in the registry that belongs to the editor's pillar (use `SELECT id, "nameAr", pillar FROM "KpiRegistry" LIMIT 5;`).

3. Prepare a test Excel file for the editor's pillar using the activity file format (columns: `الوحدة التنظيمية`, `الأنشطة`, `2025`, `المستهدف 2026`, `2026 Q1`, `الفئة`).

4. All smoke tests that write data must be cleaned up. Cleanup commands are listed after each test that writes.

---

### 3.3 Smoke tests

#### Test S1 — Login (read-only)

| | |
|---|---|
| **Action** | Navigate to `/login`; log in with the admin account |
| **Expected** | Redirected to `/dashboard`; no error |
| **Writes data** | No |

⛔ Stop if login fails. Check `AUTH_SECRET` is set and `DATABASE_URL` is reachable.

---

#### Test S2 — Editor upload: novel KPI rejected

| | |
|---|---|
| **Action** | Log in as the editor account. Navigate to `/upload`. Upload an Excel file containing a KPI name that **does not exist** in the registry for that editor's pillar |
| **Expected** | Upload returns a scope error: `لا يمكن للمحرر إنشاء مؤشرات جديدة` for that row. `created: 0, updated: 0`. The `KpiRegistry` table must NOT contain the novel KPI name |
| **Writes data** | No (the guard prevents the write) |
| **Verify in DB** | `SELECT count(*) FROM "KpiRegistry" WHERE "nameAr" = '[novel KPI name]';` → `0` |

⛔ Stop if the novel KPI appears in `KpiRegistry`. This is a security regression — halt deployment and investigate.

---

#### Test S3 — Editor upload: existing KPI staged for approval

| | |
|---|---|
| **Action** | Using the same editor account, upload a file containing **only the known existing KPI** with a new Q1 value |
| **Expected** | Response: `created: 0, updated: 1`, errors empty. A `SubmissionRow` is created with `status: PENDING`. The live `Actual` table must NOT yet show the new value |
| **Writes data** | Yes — creates `UploadSubmission` and `SubmissionRow` rows |
| **Verify in DB** | `SELECT status, "newValue" FROM "SubmissionRow" ORDER BY rowid DESC LIMIT 1;` → `PENDING` with the submitted value |
| **Cleanup** | Record the `submissionId` for use in Test S5. Leave the row PENDING until Test S4 or S5. |

---

#### Test S4 — Admin approval: live table updated, submission closed

| | |
|---|---|
| **Action** | Log in as admin. Navigate to the submission queue (`/upload/submissions`). Open the submission from Test S3. Approve the row |
| **Expected** | Row status changes to `APPROVED`. Submission status changes to `APPROVED`. The live `Actual` value for that KPI+period+year matches the submitted value |
| **Writes data** | Yes — updates `SubmissionRow`, `UploadSubmission`, `Actual` |
| **Verify in DB** | `SELECT value FROM "Actual" WHERE "kpiId" = '[kpi-id]' AND period = 'Q1' AND year = 2026;` → matches submitted value |
| **Cleanup** | Optional: delete the test Actual row: `DELETE FROM "Actual" WHERE "kpiId" = '[kpi-id]' AND period = 'Q1' AND year = 2026 AND value = [test-value];` |

---

#### Test S5 — Dashboard totals visible (read-only)

| | |
|---|---|
| **Action** | As admin or viewer, open `/dashboard`. Confirm KPI cards load and show variance colors |
| **Expected** | Cards visible; green ≥ 85 %, amber ≥ 70 %, red < 70 % (verify one card manually against `SELECT value / target * 100 FROM ...`) |
| **Writes data** | No |

---

### 3.4 Post-release monitoring

| What to check | How | Owner | Stop/rollback trigger |
|---|---|---|---|
| Application health | `GET /api/health` → `{"status":"ok","db":"ok"}` | Operator | `db: "error"` or non-200 |
| Error rate | Server logs for `[upload]`, `[approve]`, `[reject]` prefixes | Operator | Unexpected 500s on upload or approval routes |
| KPI display completeness | Manual: dashboard shows expected pillars and departments | QA | Missing departments or empty KPI cards |
| Submission queue accessible | Admin navigates to `/upload/submissions` | QA | 500 error or blank page |
| New columns not null | `SELECT count(*) FROM "User" WHERE "assignedPillarId" IS NULL AND role = 'EDITOR';` — should match known editor count | Operator | Unexpected nulls for existing editors |
| `AuditLog` writing | After Test S4, `SELECT count(*) FROM "AuditLog" WHERE timestamp > NOW() - INTERVAL '10 minutes';` → at least 1 row | Operator | Zero rows after a write operation |

**Monitor for 30 minutes post-deployment.** If any stop trigger fires within that window, begin rollback.

---

## 4. Rollback and Recovery

### 4.1 Application rollback (without database recovery)

The previous app version (`2dfd8da`) does not use the `UploadSubmission`, `SubmissionRow`, or `Comment` tables. It will run against the migrated schema without schema errors because:
- The new tables are additive and have no constraints on existing tables other than FK to `User`
- The new columns (`assignedPillarId`, `activityType`, etc.) have nullable or defaulted definitions
- The previous Prisma client does not reference the new tables

**Application rollback procedure:**

```bash
# Roll back the app to the previous commit
git checkout 2dfd8da

npm ci --omit=dev
npx prisma generate  # regenerates client for the old schema shape
npm run build

# [PLACEHOLDER] Restart app instance
# pm2 restart cultural-dashboard (or equivalent)
```

**Compatibility status:** Assumed compatible based on schema analysis. **Unverified by runtime test.** If the old app crashes after rollback, proceed to Section 4.2.

### 4.2 Database recovery (partial or failed migration)

**When to restore a backup:**
- Migration exited non-zero and the schema is in an unknown state
- Post-migration checks in Section 2.5 show data loss
- Schema is inconsistent and cannot be diagnosed quickly

**Recovery procedure:**

```bash
# 1. Stop the application to prevent new writes
# [PLACEHOLDER] stop command

# 2. Identify how much data was written after the backup
psql "$PRODUCTION_SESSION_URL" -c "
  SELECT count(*) FROM \"Actual\" WHERE \"createdAt\" > '[backup timestamp]';"
# This data will be lost on restore. Document it and decide whether to accept the loss.

# 3. Restore from backup
dropdb ers_db  # or use pg_restore --clean
pg_restore \
  --host=[PLACEHOLDER:db-host] \
  --username=ers_user \
  --dbname=ers_db \
  --no-owner \
  --format=custom \
  ers_db_<timestamp>_pre_b06e486.pgdump

# 4. Restart app on the previous commit
git checkout 2dfd8da && npm ci && npx prisma generate && npm run build
# [PLACEHOLDER] restart app

# 5. Verify health endpoint
curl -sf https://[PLACEHOLDER:app-hostname]/api/health
```

**Who decides to restore:** The operator leading the deployment, after consulting the application owner, once data-loss scope is understood.

### 4.3 Partially applied migration

If `prisma migrate deploy` failed mid-migration:

```sql
-- Identify what was applied
SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at;
```

If the new migration shows `finished_at = NULL` (started but not finished), the schema may be partially altered. DDL in PostgreSQL is transactional, so either all statements in a migration ran or none did. Verify by checking for the new tables:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('UploadSubmission','SubmissionRow','Comment');
```

- **0 rows:** The migration was fully rolled back by PostgreSQL. Investigate the error, fix it, and retry.
- **3 rows:** The migration completed but Prisma did not record it. Manually mark it applied:
  ```bash
  SESSION_URL="$PRODUCTION_SESSION_URL" npx prisma migrate resolve \
    --applied 20261107000000_backfill_schema_drift
  ```

---

## 5. Go / No-Go Sign-off

Each condition must be marked before the deployment window opens. Obtain explicit sign-off from the named approver; do not self-approve on their behalf.

### 5.1 KPI variance threshold policy

**Current implementation** (`lib/kpi.ts:18-21`):

| Range | Color |
|---|---|
| actual/target ≥ 85 % | Green |
| 70 % ≤ actual/target < 85 % | Amber |
| actual/target < 70 % | Red |

This was an intentional relaxation from the original spec (95/85) to reflect proportional early-year performance (commit `a459934`). CLAUDE.md now reflects the implementation.

**Required sign-off:** The business owner must explicitly accept these thresholds as the authoritative policy for dashboard displays, PDF exports, and narrative text.

| Item | Status | Approver | Date |
|---|---|---|---|
| Green ≥ 85 %, amber ≥ 70 %, red < 70 % accepted | **PENDING** | [PLACEHOLDER: business owner name] | — |

---

### 5.2 Approval workflow accepted as staging layer

The EDITOR upload flow does not write directly to the live KPI tables. EDITOR changes are staged in `SubmissionRow` and require ADMIN approval before they appear in dashboard data. ADMIN uploads bypass staging and write directly.

**Required sign-off:** Process owner accepts this two-tier write model for EDITOR accounts.

| Item | Status | Approver | Date |
|---|---|---|---|
| Two-tier EDITOR→staged / ADMIN→direct accepted | **PENDING** | [PLACEHOLDER: process owner name] | — |

---

### 5.3 Known limitation: take:500 query cap

All KPI list queries are hard-capped at 500 records with no overflow signal or pagination:

- `app/api/kpis/route.ts:83`
- `app/api/departments/[pillar]/route.ts:57`
- `app/api/stats/totals/route.ts:45`
- `app/api/kpis/[id]/route.ts:29`

If the KPI registry exceeds 500 records, the dashboard will silently display incomplete data. There is no indicator visible to users or operators that truncation has occurred. This is documented in `lib/kpi-limit.test.ts` and accepted as a known limitation for this release.

**Two distinct thresholds — do not conflate them:**

| Threshold | Value | Meaning |
|---|---|---|
| Application hard cap | **500** | The `take: 500` clause in the four routes above. Exceeding this causes silent truncation. This is a code limit. |
| Preflight gate | **400** | A proposed operational warning level providing ~20 % headroom below the cap. The basis for 400 is a judgment call, not a code requirement. Its appropriateness depends on how fast the KPI registry grows. |

**What to do if production count is 400 or higher:**

A count of 400–499 means the deployment may proceed, but the team must immediately schedule work to implement cursor-based pagination (the four routes listed above) before the registry reaches 500. Do not deploy and defer this — the fix is straightforward and the risk of silent data loss is real.

A count of 500 or higher means truncation is already occurring. Do not deploy this release without fixing pagination first.

**Two separate sign-off items are required:**

| Item | Status | Evidence required | Owner | Date |
|---|---|---|---|---|
| Current production KPI count recorded | **PENDING** | `SELECT count(*) FROM "KpiRegistry";` result noted by operator | Operator | — |
| Silent-truncation risk explicitly accepted for this release | **PENDING** | Count confirmed < 400, OR count 400–499 with pagination work scheduled; written acceptance if count ≥ 400 | [PLACEHOLDER: business owner name] | — |

---

### 5.4 Verification checklist

Items are grouped by when they must be completed and who provides the evidence. All items must reach VERIFIED before the deployment window opens to users.

---

#### Group A — Business and process owner approvals
*Obtain before the deployment window opens. Only the named approver can verify these; the operator cannot self-approve.*

| ID | Condition | Evidence required | Owner | Status |
|---|---|---|---|---|
| V9 | KPI variance thresholds accepted: green ≥ 85 %, amber ≥ 70 %, red < 70 % (Section 5.1) | Written sign-off from business owner | [PLACEHOLDER: business owner] | **PENDING** |
| V10 | Two-tier EDITOR→staged / ADMIN→direct write model accepted (Section 5.2) | Written sign-off from process owner | [PLACEHOLDER: process owner] | **PENDING** |

---

#### Group B — Pre-migration operator checks
*Sequential. Complete in order before touching any database schema. Each step is a hard gate for the next.*

| ID | Condition | Evidence to record | Owner | Status |
|---|---|---|---|---|
| V1 | Deployed artifact SHA is `b06e486` or `f6410ec` (Section 1.1) | `git rev-parse HEAD` output on deployment host | Operator | **PENDING** |
| V2 | Backup taken and restore-verified against a throwaway DB (Section 2.3) | Backup filename with timestamp; restore row counts match production | Operator | **PENDING** |
| V-BL | Production baseline matches a rehearsed state; STOP-M1 table completed (Section 2.1.6) | Completed STOP-M1 evidence table with all items matching | Operator | **PENDING** |
| V11a | Current production KPI count recorded (Section 5.3) | Exact count from `SELECT count(*) FROM "KpiRegistry";` | Operator | **PENDING** |
| V11b | Silent-truncation risk explicitly accepted for this release (Section 5.3) | Count < 400 confirmed, OR count 400–499 with pagination work scheduled in writing | Business owner | **PENDING** |

---

#### Group C — Post-migration, pre-access verification
*Run after migration and app deploy, before reopening access to users. QA-executable steps require the test accounts prepared in Section 3.2.*

| ID | Condition | Evidence to record | Owner | Status |
|---|---|---|---|---|
| V3 | Migration applied cleanly: `prisma migrate status` → "up to date" (Section 2.4) | Command output | Operator | **PENDING** |
| V4 | Post-migration schema parity: all 6 SQL checks in Section 2.5 passed | Recorded query outputs | Operator | **PENDING** |
| V5 | Health endpoint returns `{"status":"ok","db":"ok","env":{...}}` with no MISSING fields (Section 3.1) | `curl` output | Operator | **PENDING** |
| V6 | Smoke test S2 passed: novel KPI rejected, `KpiRegistry` count unchanged (Section 3.3) | DB count before and after; screenshot or response body | QA | **PENDING** |
| V7 | Smoke test S3 passed: existing KPI staged, live Actual not written (Section 3.3) | `SubmissionRow` status = PENDING; Actual count unchanged | QA | **PENDING** |
| V8 | Smoke test S4 passed: approval writes live Actual, submission closes (Section 3.3) | `Actual.value` matches submitted value; `UploadSubmission.status` = APPROVED | QA | **PENDING** |

---

**Deployment may proceed only when V9, V10, V1, V2, V-BL, V11a, and V11b are all VERIFIED.**  
**Access may be opened to users only when V3–V8 are additionally VERIFIED.**

*ID cross-reference for traceability: original V1→V1, V2→V2, V3→V3, V4→V4, V5→V5, V6→V6, V7→V7, V8→V8, V9→V9, V10→V10, V11→V11a+V11b, new V-BL is an addition.*

---

## Appendix: Quick reference commands

```bash
# Check migration status (read-only, any environment)
SESSION_URL="$URL" npx prisma migrate status

# Full-chain deploy: mark init applied (Case B baseline), then deploy
SESSION_URL="$URL" npx prisma migrate resolve --applied 20260610190755_init
SESSION_URL="$URL" npx prisma migrate deploy

# Health check
curl -sf https://[HOST]/api/health | python3 -m json.tool

# Confirm production KPI count
psql "$URL" -c 'SELECT count(*) FROM "KpiRegistry";'

# Count pending submissions (monitor queue depth)
psql "$URL" -c "SELECT count(*) FROM \"UploadSubmission\" WHERE status = 'PENDING';"

# Recent audit log (confirm writes are attributed)
psql "$URL" -c "SELECT \"userId\", action, \"timestamp\" FROM \"AuditLog\" ORDER BY timestamp DESC LIMIT 10;"
```
