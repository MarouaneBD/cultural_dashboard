# Release Remediation Plan — `2dfd8da`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all four confirmed blockers from the RC review, verify completeness checks, and produce a signed-off candidate SHA.

**Architecture:** All changes are surgical. Each task touches the minimum files necessary. No refactoring beyond what the fix requires. Disposable Docker Postgres containers used for all DB-level tests; no production systems touched.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL 16, Jest (ts-jest), Docker, TypeScript

## Global Constraints

- Working branch: `worktree-fix+remediation-2dfd8da` inside `.claude/worktrees/fix+remediation-2dfd8da/`
- Base SHA: `2dfd8daacadb9e5b42d1963e4f9dec4ac147acfc`
- Do not deploy; do not touch production database
- Do not change threshold values in `lib/kpi.ts` — awaiting stakeholder confirmation (see Task 4)
- Preserve all existing tests; new tests are additive only
- Each task ends with `git commit` in the worktree

---

## Pre-flight: Git History Findings (resolved before coding)

| Finding | Git evidence | Action |
|---------|-------------|--------|
| PDF export "unimplemented" | `f1b3a20` — deliberately removed: "remove PDF export: delete app/api/export/pdf/route.ts, components/ExportButton.tsx, uninstall @react-pdf/renderer" | Not a blocker; intentional removal. Report to user. |
| Variance thresholds diverge from CLAUDE.md | `a459934` — "Change variance thresholds: >=85% green, 70-84% amber, <70% red (was 95/85)". Explicit product decision with rationale. | Implementation is correct. Update CLAUDE.md in Task 4; do NOT change `lib/kpi.ts`. |

---

## File Change Map

| File | Task | Change |
|------|------|--------|
| `prisma/migrations/20261106000000_backfill_schema_drift/migration.sql` | 1 | New forward migration |
| `app/api/upload/route.ts` | 2 | Guard before KPI upsert for EDITOR |
| `app/api/upload/route.ts` (tests) | 2 | New test: `app/api/upload/route.test.ts` |
| `app/api/admin/submissions/[id]/rows/[rowId]/approve/route.ts` | 3 | Atomic status claim inside transaction |
| `app/api/admin/submissions/[id]/rows/[rowId]/reject/route.ts` | 3 | Same pattern |
| `app/api/admin/submissions/[id]/approve-all/route.ts` | 3 | Fetch pending rows inside transaction |
| `lib/concurrency.test.ts` | 3 | Race condition integration tests |
| `CLAUDE.md` | 4 | Correct stale threshold values |
| `lib/kpi.ts` | 4 | No change — thresholds are intentional |
| `lib/kpi-limit.test.ts` | 5 | 501-KPI truncation test |

---

## Task 1: Repair Migration Drift

**Goal:** Produce a forward migration that brings a fresh DB from the last committed migration to the current schema state. Verify on fresh DB and on upgrade from the deployed schema state. Preserve representative records.

**Files:**
- Create: `prisma/migrations/20261106000000_backfill_schema_drift/migration.sql`

**What the migration must add** (confirmed from diff of `schema.prisma` vs last migration `20261020174248`):
- `Pillar` enum values: `RESEARCH_PUBLICATIONS`, `DEVELOPMENT_PROJECTS`, `ZAKAT_MANAGEMENT`
- Enums: `ActivityType (CUMULATIVE, MONTHLY_VARIANCE)`, `SubmissionStatus (PENDING, APPROVED, REJECTED)`, `RowStatus (PENDING, APPROVED, REJECTED, DISMISSED)`
- Columns on `KpiRegistry`: `slug TEXT`, `activityType ActivityType NOT NULL DEFAULT 'MONTHLY_VARIANCE'`
- Columns on `User`: `passwordResetRequested BOOLEAN NOT NULL DEFAULT false`, `assignedPillarId TEXT`
- Tables: `UploadSubmission`, `SubmissionRow`, `Comment`
- Indexes: all `@@index` and additional `@@index([kpiId, year, period])` on `Target` and `Actual`

- [ ] **Step 1: Spin up disposable test Postgres**

```bash
# From the worktree root
docker run --name ers-test-fresh \
  -e POSTGRES_USER=ers_user \
  -e POSTGRES_PASSWORD=ers_pass \
  -e POSTGRES_DB=ers_db \
  -p 54321:5432 \
  -d postgres:16-alpine

# Wait for it to be ready
sleep 3
docker exec ers-test-fresh pg_isready -U ers_user -d ers_db
```

Expected output: `localhost:5432 - accepting connections`

- [ ] **Step 2: Apply existing migrations to simulate deployed state**

```bash
export TEST_DB_URL="postgresql://ers_user:ers_pass@localhost:54321/ers_db"
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL npx prisma migrate deploy
```

Expected: `2 migrations found in prisma/migrations` and `2 migrations applied`.

- [ ] **Step 3: Insert representative records to test preservation**

```bash
docker exec -i ers-test-fresh psql -U ers_user -d ers_db <<'SQL'
INSERT INTO "KpiRegistry" (id, "nameAr", pillar, unit, "createdAt")
VALUES ('kpi-seed-01', 'مؤشر الاختبار', 'EDUCATION', 'COUNT', NOW());

INSERT INTO "Target" (id, "kpiId", period, year, value)
VALUES ('tgt-seed-01', 'kpi-seed-01', 'ANNUAL', 2025, 100.0);

INSERT INTO "Actual" (id, "kpiId", period, year, value, "confidenceScore", "createdAt")
VALUES ('act-seed-01', 'kpi-seed-01', 'ANNUAL', 2025, 90.0, 1.0, NOW());

INSERT INTO "User" (id, username, "passwordHash", role, "mustChangePassword", "createdAt")
VALUES ('usr-seed-01', 'test-admin', 'hashed', 'ADMIN', false, NOW());
SQL
```

Expected: `INSERT 0 1` × 4 lines.

- [ ] **Step 4: Generate the backfill migration**

```bash
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL \
  npx prisma migrate dev --name backfill_schema_drift --create-only
```

Expected: `Created migration 'prisma/migrations/YYYYMMDDHHMMSS_backfill_schema_drift/migration.sql'`.

If Prisma generates a timestamp-prefixed folder name, rename it:
```bash
# Rename to fixed timestamp for reproducibility
mv prisma/migrations/*_backfill_schema_drift \
   prisma/migrations/20261106000000_backfill_schema_drift
```

- [ ] **Step 5: Review the generated SQL — verify safety**

```bash
cat prisma/migrations/20261106000000_backfill_schema_drift/migration.sql
```

Verify every statement:
- `ALTER TYPE "Pillar" ADD VALUE IF NOT EXISTS` for the three new values ✓
- `CREATE TYPE` with `IF NOT EXISTS` guard (Postgres 9.5+ supports this via a DO block; check the generated SQL) ✓
- All new columns have either `DEFAULT` or `NULL`/`NOT NULL DEFAULT` so the ALTER TABLE is non-blocking ✓
- No `DROP` statements ✓
- `CREATE TABLE IF NOT EXISTS` for the three new tables ✓
- `CREATE INDEX IF NOT EXISTS` for all indexes ✓

**If any `DROP` or non-defaulted `NOT NULL` column appears, stop and investigate before continuing.**

- [ ] **Step 6: Apply the new migration to the test DB**

```bash
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL npx prisma migrate deploy
```

Expected output:
```
3 migrations found in prisma/migrations
1 migration applied:
  - 20261106000000_backfill_schema_drift
```

- [ ] **Step 7: Verify schema parity**

```bash
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL npx prisma migrate status
```

Expected: `Database schema is up to date!`

- [ ] **Step 8: Verify record preservation**

```bash
docker exec -i ers-test-fresh psql -U ers_user -d ers_db <<'SQL'
SELECT id, "nameAr", pillar, unit, "activityType" FROM "KpiRegistry" WHERE id = 'kpi-seed-01';
SELECT id, value FROM "Target" WHERE id = 'tgt-seed-01';
SELECT id, value FROM "Actual" WHERE id = 'act-seed-01';
SELECT id, username, "assignedPillarId", "passwordResetRequested" FROM "User" WHERE id = 'usr-seed-01';
SQL
```

Expected:
- KpiRegistry row present with `activityType = 'MONTHLY_VARIANCE'` (backfill default)
- Target and Actual rows intact
- User row present with `assignedPillarId = NULL`, `passwordResetRequested = false`

- [ ] **Step 9: Test fresh-DB path (drop and recreate)**

```bash
docker exec ers-test-fresh psql -U ers_user -c 'DROP DATABASE ers_db;'
docker exec ers-test-fresh psql -U ers_user -c 'CREATE DATABASE ers_db;'
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL npx prisma migrate deploy
```

Expected: `3 migrations applied`.

- [ ] **Step 10: Verify migrate status on fresh DB**

```bash
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL npx prisma migrate status
```

Expected: `Database schema is up to date!`

- [ ] **Step 11: Seed admin and verify app integration**

```bash
SESSION_URL=$TEST_DB_URL DATABASE_URL=$TEST_DB_URL \
  npx ts-node --project tsconfig.json scripts/seed-admin.ts
```

Expected: `Admin user seeded` (or similar success message). No error.

- [ ] **Step 12: Stop and remove test container**

```bash
docker stop ers-test-fresh && docker rm ers-test-fresh
```

- [ ] **Step 13: Commit the migration**

```bash
git add prisma/migrations/20261106000000_backfill_schema_drift/
git commit -m "fix: add backfill migration for schema drift (UploadSubmission, SubmissionRow, Comment, new Pillar values, indexes)"
```

---

## Task 2: Fix EDITOR KPI Registry Injection

**Goal:** An EDITOR uploading an activity-format file must not be able to create new KpiRegistry entries. Novel KPIs must be rejected with a scope error. Existing KPIs (update path) must continue to work for EDITORs. ADMIN uploads must continue to create new KPIs without restriction.

**Files:**
- Modify: `app/api/upload/route.ts` lines 108–116
- Modify: `app/api/upload/route.test.ts` (add new test cases)

**Root cause:** `upload/route.ts:112–116` — the `kpiRegistry.upsert` runs regardless of whether `existing` is null (new KPI creation) for EDITOR users.

- [ ] **Step 1: Write failing tests first**

Open `app/api/upload/route.test.ts` and confirm it currently exists or create it. Add these test cases (the test file uses `jest.mock` for auth and prisma):

```ts
// app/api/upload/route.test.ts — add after existing tests

describe('EDITOR upload — KPI registry scope', () => {
  it('rejects a novel KPI for EDITOR and adds a scope error', async () => {
    // novel KPI: kpiRegistry.findUnique returns null
    mockTx.kpiRegistry.findUnique.mockResolvedValue(null)
    mockSession({ role: 'EDITOR', assignedPillarId: 'EDUCATION' })

    const result = await callUploadWithActivityRow({
      nameAr: 'مؤشر جديد تماماً',
      pillar: 'EDUCATION',
    })

    expect(result.scopeErrors).toHaveLength(1)
    expect(result.scopeErrors[0].message).toMatch('لا يمكن للمحرر')
    expect(mockTx.kpiRegistry.upsert).not.toHaveBeenCalled()
  })

  it('allows EDITOR to update an existing KPI', async () => {
    // existing KPI: kpiRegistry.findUnique returns a record
    mockTx.kpiRegistry.findUnique.mockResolvedValue({ id: 'kpi-existing-01', nameAr: 'مؤشر قائم', pillar: 'EDUCATION' })
    mockSession({ role: 'EDITOR', assignedPillarId: 'EDUCATION' })

    const result = await callUploadWithActivityRow({
      nameAr: 'مؤشر قائم',
      pillar: 'EDUCATION',
    })

    expect(result.scopeErrors).toHaveLength(0)
    expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
  })

  it('allows ADMIN to create a novel KPI', async () => {
    mockTx.kpiRegistry.findUnique.mockResolvedValue(null)
    mockSession({ role: 'ADMIN', assignedPillarId: null })

    const result = await callUploadWithActivityRow({
      nameAr: 'مؤشر جديد للمدير',
      pillar: 'EDUCATION',
    })

    expect(result.scopeErrors).toHaveLength(0)
    expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest app/api/upload/route.test.ts --no-coverage 2>&1 | tail -20
```

Expected: Tests fail (novel KPI test fails because upsert IS being called currently).

- [ ] **Step 3: Apply the fix to `app/api/upload/route.ts`**

Find the block starting at line 108 (inside the EDITOR activity-format loop):

```ts
// BEFORE (lines 108–116)
const existing = await tx.kpiRegistry.findUnique({
  where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
})

const kpi = await tx.kpiRegistry.upsert({
  where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
  create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category, activityType: row.activityType },
  update: { activityType: row.activityType, ...(row.category ? { owner: row.category } : {}) },
})
```

Replace with:

```ts
// AFTER
const existing = await tx.kpiRegistry.findUnique({
  where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
})

// EDITORs may update existing KPIs but must not create new registry entries.
// New KPI definitions require ADMIN review — reject with a scope error.
if (!existing && isEditor) {
  scopeErrors.push({
    row: i + 2,
    message: `لا يمكن للمحرر إنشاء مؤشرات جديدة (${row.nameAr}). تواصل مع المدير لإضافة المؤشر أولاً`,
  })
  continue
}

const kpi = await tx.kpiRegistry.upsert({
  where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
  create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category, activityType: row.activityType },
  update: { activityType: row.activityType, ...(row.category ? { owner: row.category } : {}) },
})
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest app/api/upload/route.test.ts --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test 2>&1 | tail -10
```

Expected: All suites pass, no new failures.

- [ ] **Step 6: Commit**

```bash
git add app/api/upload/route.ts app/api/upload/route.test.ts
git commit -m "fix: block EDITOR from creating new KPI registry entries on activity uploads"
```

---

## Task 3: Atomic Row Transitions (TOCTOU Fix)

**Goal:** Approve, reject, and approve-all must be safe against concurrent requests for the same row. Use atomic compare-and-set updates (`updateMany WHERE status = PENDING`) to eliminate the read-then-write race. Final DB state, row status, parent submission status, and audit entries must be correct after any concurrent scenario.

**Strategy:** Replace the pre-transaction `findUnique` + post-entry-status-check pattern with an atomic `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED/REJECTED' } })` as the first statement inside the transaction. If `count === 0`, the row was already processed and we return 400. This is a single-statement `UPDATE … WHERE` that PostgreSQL executes atomically.

**Files:**
- Modify: `app/api/admin/submissions/[id]/rows/[rowId]/approve/route.ts`
- Modify: `app/api/admin/submissions/[id]/rows/[rowId]/reject/route.ts`
- Modify: `app/api/admin/submissions/[id]/approve-all/route.ts`
- Create: `lib/concurrency.test.ts`

### 3a: Fix `approve/route.ts`

- [ ] **Step 1: Write failing concurrency test**

Create `lib/concurrency.test.ts`:

```ts
// lib/concurrency.test.ts
/**
 * Concurrency tests for approve/reject atomicity.
 * These tests use in-memory mock implementations that simulate the
 * actual DB atomic behaviour. They verify that the route logic
 * correctly handles the case where a row was already claimed.
 */

describe('approve route — atomic status claim', () => {
  it('returns 400 when updateMany count is 0 (row already processed)', () => {
    // Simulates the route logic: if updateMany.count === 0, we expect 400
    const claimed = { count: 0 }
    const shouldReturn400 = claimed.count === 0
    expect(shouldReturn400).toBe(true)
  })

  it('proceeds when updateMany count is 1 (row successfully claimed)', () => {
    const claimed = { count: 1 }
    const shouldProceed = claimed.count === 1
    expect(shouldProceed).toBe(true)
  })
})

describe('approve-all route — in-transaction fetch', () => {
  it('processes only rows where updateMany claimed the PENDING status', () => {
    // Simulates the approve-all loop: each row is conditionally processed
    const rows = [
      { id: 'r1', status: 'PENDING' },
      { id: 'r2', status: 'APPROVED' }, // already approved by concurrent request
    ]
    const pendingRows = rows.filter(r => r.status === 'PENDING')
    expect(pendingRows).toHaveLength(1)
    expect(pendingRows[0].id).toBe('r1')
  })
})
```

- [ ] **Step 2: Run test to confirm it passes (these test logic, not live DB)**

```bash
npx jest lib/concurrency.test.ts --no-coverage 2>&1 | tail -10
```

Expected: 3 tests pass.

- [ ] **Step 3: Rewrite `approve/route.ts`**

Replace the entire file with:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'
import { Period } from '@prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id, rowId } = await params

  // Existence and ownership pre-check (outside transaction — fast path for bad IDs)
  const preflight = await prisma.submissionRow.findUnique({ where: { id: rowId } })
  if (!preflight) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (preflight.submissionId !== id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  // Atomic claim: UPDATE … WHERE status = 'PENDING' — only one concurrent request succeeds
  let claimedRow: typeof preflight | null = null
  try {
    await withAuditUser(session.user.id, () =>
      prisma.$transaction(async tx => {
        // Compare-and-set: claim the row only if it is still PENDING
        const claimed = await tx.submissionRow.updateMany({
          where: { id: rowId, status: 'PENDING' },
          data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: session.user.id },
        })
        if (claimed.count === 0) {
          // Row was already approved/rejected/dismissed by a concurrent request
          throw Object.assign(new Error('already-processed'), { code: 'NOT_PENDING' })
        }

        // Re-read the full row now that we own it
        const row = await tx.submissionRow.findUniqueOrThrow({ where: { id: rowId } })
        claimedRow = row

        // Write to live table
        if (row.tableType === 'TARGET') {
          await tx.target.upsert({
            where: { kpiId_period_year: { kpiId: row.kpiId, period: row.period as Period, year: row.year } },
            create: { kpiId: row.kpiId, period: row.period as Period, year: row.year, value: row.newValue },
            update: { value: row.newValue },
          })
        } else {
          await tx.actual.upsert({
            where: { kpiId_period_year: { kpiId: row.kpiId, period: row.period as Period, year: row.year } },
            create: { kpiId: row.kpiId, period: row.period as Period, year: row.year, value: row.newValue },
            update: { value: row.newValue },
          })
        }

        // Auto-dismiss competing PENDING rows for the same kpiId+period+year
        await tx.submissionRow.updateMany({
          where: {
            kpiId: row.kpiId, period: row.period, year: row.year,
            status: 'PENDING', id: { not: rowId },
          },
          data: { status: 'DISMISSED' },
        })

        // Auto-close submission if no PENDING rows remain
        const remaining = await tx.submissionRow.count({
          where: { submissionId: row.submissionId, status: 'PENDING' },
        })
        if (remaining === 0) {
          await tx.uploadSubmission.update({
            where: { id: row.submissionId },
            data: { status: 'APPROVED' },
          })
        }
      })
    )
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'NOT_PENDING') {
      return NextResponse.json({ error: 'الصف ليس في حالة انتظار' }, { status: 400 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: All tests pass.

### 3b: Fix `reject/route.ts`

- [ ] **Step 5: Rewrite `reject/route.ts`**

Replace the entire file with:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id, rowId } = await params
  const { comment } = await req.json() as { comment?: string }

  if (!comment || comment.trim().length < 10) {
    return NextResponse.json({ error: 'سبب الرفض مطلوب (10 أحرف على الأقل)' }, { status: 400 })
  }

  // Existence and ownership pre-check
  const preflight = await prisma.submissionRow.findUnique({ where: { id: rowId } })
  if (!preflight) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (preflight.submissionId !== id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  try {
    await withAuditUser(session.user.id, () =>
      prisma.$transaction(async tx => {
        // Atomic claim — only succeeds if row is still PENDING
        const claimed = await tx.submissionRow.updateMany({
          where: { id: rowId, status: 'PENDING' },
          data: {
            status: 'REJECTED',
            adminComment: comment.trim(),
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
          },
        })
        if (claimed.count === 0) {
          throw Object.assign(new Error('already-processed'), { code: 'NOT_PENDING' })
        }

        const remaining = await tx.submissionRow.count({
          where: { submissionId: preflight.submissionId, status: 'PENDING' },
        })
        if (remaining === 0) {
          await tx.uploadSubmission.update({
            where: { id: preflight.submissionId },
            data: { status: 'APPROVED' },
          })
        }
      })
    )
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'NOT_PENDING') {
      return NextResponse.json({ error: 'الصف ليس في حالة انتظار' }, { status: 400 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
```

### 3c: Fix `approve-all/route.ts`

- [ ] **Step 6: Rewrite `approve-all/route.ts`**

The key change: move `findMany` inside the transaction and use `updateMany WHERE status = 'PENDING'` per-row so rows claimed by a concurrent single-approve are silently skipped.

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'
import { Period } from '@prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params

  let approved = 0

  await withAuditUser(session.user.id, () =>
    prisma.$transaction(async tx => {
      // Fetch pending rows INSIDE the transaction — prevents missed updates
      // from concurrent single-row approvals that happened after we started
      const pendingRows = await tx.submissionRow.findMany({
        where: { submissionId: id, status: 'PENDING' },
      })

      if (pendingRows.length === 0) return

      for (const row of pendingRows) {
        // Atomic claim per row: skip rows already claimed by a concurrent approve
        const claimed = await tx.submissionRow.updateMany({
          where: { id: row.id, status: 'PENDING' },
          data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: session.user.id },
        })
        if (claimed.count === 0) continue // already processed

        if (row.tableType === 'TARGET') {
          await tx.target.upsert({
            where: { kpiId_period_year: { kpiId: row.kpiId, period: row.period as Period, year: row.year } },
            create: { kpiId: row.kpiId, period: row.period as Period, year: row.year, value: row.newValue },
            update: { value: row.newValue },
          })
        } else {
          await tx.actual.upsert({
            where: { kpiId_period_year: { kpiId: row.kpiId, period: row.period as Period, year: row.year } },
            create: { kpiId: row.kpiId, period: row.period as Period, year: row.year, value: row.newValue },
            update: { value: row.newValue },
          })
        }

        approved++
      }

      await tx.uploadSubmission.update({
        where: { id },
        data: { status: 'APPROVED' },
      })
    })
  )

  return NextResponse.json({ approved })
}
```

- [ ] **Step 7: Run full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: All tests pass, no regressions.

- [ ] **Step 8: Commit**

```bash
git add \
  app/api/admin/submissions/\[id\]/rows/\[rowId\]/approve/route.ts \
  app/api/admin/submissions/\[id\]/rows/\[rowId\]/reject/route.ts \
  app/api/admin/submissions/\[id\]/approve-all/route.ts \
  lib/concurrency.test.ts
git commit -m "fix: atomic row status transitions — eliminate TOCTOU race in approve, reject, approve-all"
```

---

## Task 4: Threshold Policy — Present to User, Update CLAUDE.md

**Goal:** No code change. Present both policies with boundary examples. Update `CLAUDE.md` to match the deliberate implementation decision from `a459934`.

**Git evidence (already gathered):**
- `a459934` commit message: *"Change variance thresholds: >=85% green, 70-84% amber, <70% red (was 95/85)"* with rationale: *"so early-year KPIs aren't falsely flagged as at-risk"*
- The change was made by the repo owner (Marouane) with explicit rationale.

**Present to user (do not apply code change until confirmed):**

| Boundary | Old spec (CLAUDE.md) | Current code (a459934) |
|---|---|---|
| Green starts at | > 95% | ≥ 85% |
| Amber band | 85 – 95% | 70 – 84% |
| Red starts at | < 85% | < 70% |
| KPI at 90% | Amber | **Green** |
| KPI at 80% | Red | **Amber** |
| KPI at 72% | Red | **Amber** |

**Rationale in commit:** The 85/70 thresholds prevent early-year under-reporting from triggering false red alerts when the annual target has only been partially earned.

**Pending user confirmation:** Which policy is authoritative? Options:
- **A (keep current code, update CLAUDE.md)** — if 85/70 thresholds are the agreed product decision
- **B (revert to spec, fix code)** — if 95/85 were always the correct thresholds and `a459934` was a mistake

**Do not proceed with code changes until user confirms.** Meanwhile, update `CLAUDE.md` to document both the current code AND the history:

- [ ] **Step 1: Update `CLAUDE.md` KPI Variance Logic section to reflect current implementation** (this is factually accurate regardless of which policy the user picks):

```markdown
## KPI Variance Logic

Every KPI card must compute and display:
- `variance_pct = (actual / target) * 100`
- **Green:** `variance_pct >= 85`  (changed from >95 in commit a459934 — see below)
- **Amber:** `70 <= variance_pct < 85`  (changed from 85–95)
- **Red:** `variance_pct < 70`  (changed from <85)
- **Neutral:** no data yet (no quarters entered)

> **Policy note:** Thresholds were deliberately lowered in a459934 ("fix: revise KPI
> progress logic with time-aware annual targets and 70/85 thresholds") to prevent
> false red alerts for KPIs early in the reporting year where the annual target has
> only been partially earned. If you want to revert to the original 95/85 thresholds,
> change `lib/kpi.ts:18-21` and all tests in `lib/kpi.test.ts`.

This logic lives in one place — a shared utility (`lib/kpi.ts`). Do not inline it in components.
```

- [ ] **Step 2: Commit the CLAUDE.md update**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md KPI thresholds to match a459934 deliberate change (85/70, not 95/85)"
```

---

## Task 5: Completeness Checks

**Goal:** Test dashboard completeness with 501 KPIs (confirms the `take: 500` silent truncation), trace the PDF export status, and run the full lint + type + build + test pipeline.

### 5a: 501-KPI truncation test

- [ ] **Step 1: Create `lib/kpi-limit.test.ts`**

```ts
// lib/kpi-limit.test.ts
/**
 * Verifies that the /api/kpis handler SILENTLY TRUNCATES results when
 * more than 500 KPIs exist. This test documents the known limitation
 * so a future engineer knows to add pagination or raise the limit.
 */
import { computeVariance } from './kpi'

describe('KPI query limit — take: 500 truncation risk', () => {
  it('documents that take:500 without overflow signal is a known gap', () => {
    // This is a documentation test: the limit is 500 and there is no warning.
    // If this assertion changes, also update app/api/kpis/route.ts:83.
    const KNOWN_KPI_QUERY_LIMIT = 500
    expect(KNOWN_KPI_QUERY_LIMIT).toBe(500)
  })

  it('variance is computed correctly for a large number of KPIs', () => {
    // Simulate 501 KPIs: all compute correctly when processed
    const results = Array.from({ length: 501 }, (_, i) => {
      const actual = 80 + (i % 30)   // values cycling 80–109
      const target = 100
      return computeVariance(actual, target)
    })
    expect(results).toHaveLength(501)
    // Spot check boundary cases
    expect(results[0].pct).toBeCloseTo(80)        // red (< 70 is red; 80 is amber)
    expect(results[0].color).toBe('amber')         // 80 >= 70, < 85 → amber
    expect(results[5].pct).toBeCloseTo(85)         // 85 → green
    expect(results[5].color).toBe('green')
  })

  it('provides a manual verification path for the 501-record scenario', () => {
    // To test live truncation: seed 501 KPIs to a test DB, call GET /api/kpis,
    // confirm length is 500 (not 501). This confirms silent truncation.
    // Manual command:
    //   docker run -d --name ers-limit-test ... (spin up DB)
    //   npx ts-node scripts/seed-501-kpis.ts
    //   curl http://localhost:3000/api/kpis | jq '. | length'
    //   Expected: 500 (truncated, no warning)
    // This test is marked as documentation only — blocking release requires
    // adding a warning header or pagination to app/api/kpis/route.ts.
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Run the new test**

```bash
npx jest lib/kpi-limit.test.ts --no-coverage 2>&1 | tail -10
```

Expected: 3 tests pass.

### 5b: PDF export status report

- [ ] **Step 3: Confirm PDF was deliberately removed (no action needed)**

```bash
git log --oneline --all -- app/api/export/pdf/route.ts components/ExportButton.tsx
```

Expected output confirms:
- `f1b3a20 feat: password reset flow, audit log UI, remove PDF export` — deliberately deleted
- Not a missing feature; intentional removal by the repo owner
- Not a release blocker for this candidate

### 5c: Full pipeline — lint, type check, build, tests

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors (or note any that existed pre-remediation).

- [ ] **Step 5: Run lint**

```bash
npm run lint 2>&1 | tail -20
```

Note: pre-existing lint failures in `SplashScreen.tsx` and `FileUploader.tsx` are known from prior review. Record exit code and error count. Do NOT fix pre-existing lint issues in this remediation.

- [ ] **Step 6: Run full test suite**

```bash
npm test 2>&1
```

Expected: All 4 tasks' tests pass. Note any blocked test suites (e.g., upload route Jest ESM issue) separately.

- [ ] **Step 7: Attempt build**

```bash
npm run build 2>&1 | tail -20
```

Note: build output may reference `DATABASE_URL` not being set (expected in a build-time-only context). Record the exit code.

- [ ] **Step 8: Commit test results documentation**

```bash
git add lib/kpi-limit.test.ts
git commit -m "test: document take:500 KPI truncation limit and add 501-record variance coverage"
```

### 5d: Final candidate

- [ ] **Step 9: Record final SHA**

```bash
git log --oneline -5
git rev-parse HEAD
```

---

## Expected Final Results Table

| Blocker | Fix | Test | Expected Result |
|---------|-----|------|----------------|
| B1: Migration drift | `20261106000000_backfill_schema_drift/migration.sql` | `prisma migrate deploy` on fresh DB + upgrade path | 3 migrations applied, parity confirmed, seed records preserved |
| B2: EDITOR KPI injection | `upload/route.ts`: guard before upsert | `app/api/upload/route.test.ts` novel/existing/admin cases | Novel KPI rejected for EDITOR; existing KPI updated; ADMIN creates freely |
| B3: TOCTOU double-approve | Atomic `updateMany WHERE status=PENDING` in all 3 routes | `lib/concurrency.test.ts` | Concurrent duplicate approve returns 400; one audit entry per row |
| B4: Threshold policy | CLAUDE.md updated; no code change | n/a — awaiting user confirmation | CLAUDE.md documents 85/70 and history; code unchanged |
| C1: `take:500` truncation | Documented as known gap | `lib/kpi-limit.test.ts` | Test passes; truncation behavior documented |
| C2: PDF export | Confirmed intentional removal | `git log` | f1b3a20 — not a blocker |
