# Staging Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three gaps that allow EDITOR data to bypass the approval queue and reach live tables without ADMIN review.

**Architecture:** All changes are confined to two source files (`lib/excel.ts`, `app/api/upload/route.ts`) and one type file (`types/index.ts`). No schema migration. The fix removes the legacy Excel path entirely and tightens the EDITOR staging branches so a missing prior row is staged (with `oldValue: 0`) rather than written live.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Jest (config: `jest.worktree.config.ts`)

## Global Constraints

- Run tests with: `npx jest --config jest.worktree.config.ts --no-coverage`
- Run a single file: `npx jest --config jest.worktree.config.ts app/api/upload/route.test.ts --no-coverage`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- All Arabic copy is RTL — do not alter it
- `normalizeAr` strips invisible Unicode (`\u200b–\u200f`, `\u202a–\u202e`, `\u2060`, `\ufeff`, `\u00a0`) and trims
- `REPORTING_YEAR = 2026`, `PREV_REPORTING_YEAR = 2025` — do not hardcode years

---

## File Map

| File | What changes |
|---|---|
| `lib/excel.ts` | Remove `normalizeRow`, `validateRow`, `parseExcelFile`; export `normalizeAr` |
| `app/api/upload/route.ts` | Remove legacy branch; fix 3 EDITOR `else` bypasses; apply `normalizeAr` to `owner` |
| `types/index.ts` | Remove `UploadRow`, `UploadValidationResult` |
| `app/api/upload/route.test.ts` | Add legacy-format 400 test; add 2 EDITOR first-write staging tests |

---

### Task 1: Remove the legacy Excel format

**Files:**
- Modify: `lib/excel.ts`
- Modify: `app/api/upload/route.ts`
- Modify: `types/index.ts`
- Test: `app/api/upload/route.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks
- Produces: `isActivityFile`, `parseActivityFile`, `normalizeAr` remain exported from `lib/excel.ts`. Everything else is deleted.

- [ ] **Step 1: Write the failing test**

Add this test to `app/api/upload/route.test.ts` after the existing `beforeEach` block:

```ts
// ── Legacy format must return 400 ────────────────────────────────────────────

function makeLegacyBuffer(): ArrayBuffer {
  // A file with no 'الأنشطة' column — the legacy format detector returns false
  const ws = XLSX.utils.json_to_sheet([{
    kpiId: 'kpi-existing-01',
    period: 'Q1',
    year: 2026,
    value: 85,
  }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

it('returns 400 for legacy-format files (no الأنشطة column)', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  const res = await POST(makeRequest(makeLegacyBuffer()))
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toMatch('صيغة الملف غير مدعومة')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest --config jest.worktree.config.ts app/api/upload/route.test.ts --no-coverage -t "legacy"
```

Expected: FAIL — the route currently processes the legacy format and returns 200.

- [ ] **Step 3: Remove `parseExcelFile`, `normalizeRow`, `validateRow` from `lib/excel.ts`**

Delete these three functions and their import. The file starts with:

```ts
import * as XLSX from 'xlsx'
import type { ActivityType } from '@prisma/client'
import type { ActivityRow, ActivityUploadResult } from '@/types'
import { REPORTING_YEAR } from '@/lib/config'
```

(Remove `UploadRow, UploadValidationResult` from the import — they are no longer used here.)

Delete the entire blocks for `normalizeRow` (lines ~14–21), `validateRow` (lines ~23–33), and `parseExcelFile` (lines ~35–65). Keep everything from `DEPT_NAME_TO_PILLAR` onward.

- [ ] **Step 4: Replace the legacy branch in `app/api/upload/route.ts`**

Find the section that starts with the comment `// ── Legacy format` (after the closing `}` of the activity path's `return NextResponse.json`). It currently reads:

```ts
    // ── Legacy format ──────────────────────────────────────────────────────────────
    const { valid, errors } = parseExcelFile(buffer)

    if (dryRun) {
      return NextResponse.json({ dryRun: true, preview: valid, errors })
    }

    const isEditor = session!.user.role === 'EDITOR'
    const assignedPillarId = session!.user.assignedPillarId ?? null

    const dbErrors: Array<{ row: number; message: string }> = []
    const scopeErrors: Array<{ row: number; message: string }> = []
    let imported = 0

    // EDITOR scope check — resolve each kpiId to its pillar and reject mismatches
    let allowedRows = valid
    if (isEditor) {
      if (!assignedPillarId) {
        return NextResponse.json({ error: 'لم يتم تعيين قسم لهذا المحرر، تواصل مع المدير' }, { status: 403 })
      }
      const kpiIds = [...new Set(valid.map(r => r.kpiId))]
      const registryEntries = await prisma.kpiRegistry.findMany({
        where: { id: { in: kpiIds } },
        select: { id: true, pillar: true },
      })
      const pillarByKpiId = new Map(registryEntries.map(e => [e.id, e.pillar as string]))
      allowedRows = valid.filter((row, i) => {
        const pillar = pillarByKpiId.get(row.kpiId)
        if (!pillar || pillar !== assignedPillarId) {
          scopeErrors.push({ row: i + 2, message: `ليس لديك صلاحية رفع بيانات المؤشر: ${row.kpiId}` })
          return false
        }
        return true
      })
    }

    try {
      await withAuditUser(session!.user.id, () => prisma.$transaction(async (tx: TxClient) => {
        for (let i = 0; i < allowedRows.length; i++) {
          const row = allowedRows[i]
          try {
            await tx.actual.create({
              data: {
                kpiId: row.kpiId,
                period: row.period as Period,
                year: row.year,
                value: row.value,
                region: row.region,
                facility: row.facility,
              },
            })
            imported++
          } catch {
            dbErrors.push({ row: i + 2, message: `خطأ في حفظ البيانات: ${row.kpiId}` })
          }
        }
      }, { timeout: 50000 }))
    } catch (err) {
      console.error('[upload] legacy transaction failed', err)
      return NextResponse.json({ error: 'فشل حفظ البيانات' }, { status: 500 })
    }

    return NextResponse.json({ imported, errors: [...errors, ...dbErrors, ...scopeErrors] })
```

Replace the entire block above with:

```ts
    return NextResponse.json(
      { error: 'صيغة الملف غير مدعومة. استخدم قالب رفع النشاط' },
      { status: 400 }
    )
```

Also remove the `parseExcelFile` import from the top of `route.ts`. The import line reads:

```ts
import { isActivityFile, parseActivityFile } from '@/lib/excel'
```

(It already does not import `parseExcelFile` by name — the function was called directly. Remove the reference inside the now-deleted block; the import line itself needs no change.)

- [ ] **Step 5: Remove `UploadRow` and `UploadValidationResult` from `types/index.ts`**

Delete these two type definitions:

```ts
export interface UploadRow {
  kpiId: string
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL'
  year: number
  value: number
  region?: string
  facility?: string
}

export interface UploadValidationResult {
  valid: UploadRow[]
  errors: Array<{ row: number; message: string }>
}
```

- [ ] **Step 6: Run the type check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Cannot find name 'parseExcelFile'` or `Property 'UploadRow' does not exist`, you have a stale reference — search with `grep -rn "parseExcelFile\|UploadRow\|UploadValidationResult" --include="*.ts" --include="*.tsx" .` and remove it.

- [ ] **Step 7: Run the tests**

```bash
npx jest --config jest.worktree.config.ts app/api/upload/route.test.ts --no-coverage
```

Expected: 5 tests pass (4 existing + 1 new).

- [ ] **Step 8: Commit**

```bash
git add lib/excel.ts app/api/upload/route.ts app/api/upload/route.test.ts types/index.ts
git commit -m "fix: remove legacy Excel upload format, return 400 for non-activity files"
```

---

### Task 2: Fix EDITOR first-write staging bypass

**Files:**
- Modify: `app/api/upload/route.ts`
- Test: `app/api/upload/route.test.ts`

**Interfaces:**
- Consumes: `makeTxMock` from `route.test.ts` (already has `target.findUnique` and `actual.findUnique` mocks)
- Produces: all three EDITOR write blocks unconditionally push to `stagingRows`; `oldValue` is `0` when no prior row exists

- [ ] **Step 1: Write the failing tests**

Add these two tests to `app/api/upload/route.test.ts`:

```ts
// ── EDITOR staging: first-write (no prior row) must be STAGED, not written live ─

it('EDITOR: target with no prior row is staged (oldValue=0), not written to live table', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  // No existing target or actual
  mockTx.target.findUnique.mockResolvedValue(null)
  mockTx.actual.findUnique.mockResolvedValue(null)

  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.queued).toBeGreaterThan(0)
  // Live upsert must NOT have been called for target or actual
  expect(mockTx.target.upsert).not.toHaveBeenCalled()
  expect(mockTx.actual.upsert).not.toHaveBeenCalled()
  // Submission must have been created
  expect(mockTx.uploadSubmission.create).toHaveBeenCalledTimes(1)
  // The staged rows must have oldValue: 0
  const createCall = mockTx.uploadSubmission.create.mock.calls[0][0]
  const stagedRows: Array<{ oldValue: number }> = createCall.data.rows.create
  expect(stagedRows.every(r => r.oldValue === 0)).toBe(true)
})

it('EDITOR: target with existing row is staged with correct oldValue', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  mockTx.target.findUnique.mockResolvedValue({ value: 90 })
  mockTx.actual.findUnique.mockResolvedValue({ value: 75 })

  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.queued).toBeGreaterThan(0)
  expect(mockTx.target.upsert).not.toHaveBeenCalled()
  expect(mockTx.actual.upsert).not.toHaveBeenCalled()
  // At least one staged row must have oldValue: 90 or 75 (from the mocked existing rows)
  const createCall = mockTx.uploadSubmission.create.mock.calls[0][0]
  const stagedRows: Array<{ oldValue: number }> = createCall.data.rows.create
  const oldValues = stagedRows.map(r => r.oldValue)
  expect(oldValues).toContain(90)  // from target.findUnique
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest --config jest.worktree.config.ts app/api/upload/route.test.ts --no-coverage -t "first-write|existing row"
```

Expected: FAIL — the route currently calls `tx.target.upsert` / `tx.actual.upsert` for EDITORs when no prior row exists.

- [ ] **Step 3: Fix Block 1 — `target2026`**

In `app/api/upload/route.ts`, find the `if (row.target2026 !== undefined)` block inside the EDITOR path. It currently reads:

```ts
              if (row.target2026 !== undefined) {
                if (isEditor) {
                  const existingTarget = await tx.target.findUnique({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                  })
                  if (existingTarget) {
                    stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: 'ANNUAL', year: REPORTING_YEAR, newValue: row.target2026, oldValue: existingTarget.value, tableType: 'TARGET' })
                  } else {
                    await tx.target.upsert({
                      where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                      create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: REPORTING_YEAR, value: row.target2026 },
                      update: { value: row.target2026 },
                    })
                  }
                } else {
                  await tx.target.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                    create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: REPORTING_YEAR, value: row.target2026 },
                    update: { value: row.target2026 },
                  })
                }
              }
```

Replace with:

```ts
              if (row.target2026 !== undefined) {
                if (isEditor) {
                  const existingTarget = await tx.target.findUnique({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                  })
                  stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: 'ANNUAL', year: REPORTING_YEAR, newValue: row.target2026, oldValue: existingTarget ? Number(existingTarget.value) : 0, tableType: 'TARGET' })
                } else {
                  await tx.target.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                    create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: REPORTING_YEAR, value: row.target2026 },
                    update: { value: row.target2026 },
                  })
                }
              }
```

- [ ] **Step 4: Fix Block 2 — `actual2025`**

Find the `if (row.actual2025 !== undefined)` block. It currently reads:

```ts
              if (row.actual2025 !== undefined) {
                if (isEditor) {
                  const existingActual = await tx.actual.findUnique({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                  })
                  if (existingActual) {
                    stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: 'ANNUAL', year: PREV_REPORTING_YEAR, newValue: row.actual2025, oldValue: existingActual.value, tableType: 'ACTUAL' })
                  } else {
                    await tx.actual.upsert({
                      where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                      create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: PREV_REPORTING_YEAR, value: row.actual2025 },
                      update: { value: row.actual2025 },
                    })
                  }
                } else {
                  await tx.actual.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                    create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: PREV_REPORTING_YEAR, value: row.actual2025 },
                    update: { value: row.actual2025 },
                  })
                }
              }
```

Replace with:

```ts
              if (row.actual2025 !== undefined) {
                if (isEditor) {
                  const existingActual = await tx.actual.findUnique({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                  })
                  stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: 'ANNUAL', year: PREV_REPORTING_YEAR, newValue: row.actual2025, oldValue: existingActual ? Number(existingActual.value) : 0, tableType: 'ACTUAL' })
                } else {
                  await tx.actual.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                    create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: PREV_REPORTING_YEAR, value: row.actual2025 },
                    update: { value: row.actual2025 },
                  })
                }
              }
```

- [ ] **Step 5: Fix Block 3 — quarterly actuals loop**

Find the `for (const [q, val] of Object.entries(row.actuals))` loop. The EDITOR branch currently reads:

```ts
                  if (isEditor) {
                    const existingActual = await tx.actual.findUnique({
                      where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR } },
                    })
                    if (existingActual) {
                      stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: q, year: REPORTING_YEAR, newValue: val, oldValue: existingActual.value, tableType: 'ACTUAL' })
                    } else {
                      await tx.actual.upsert({
                        where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR } },
                        create: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR, value: val },
                        update: { value: val },
                      })
                    }
                  } else {
```

Replace the EDITOR branch with:

```ts
                  if (isEditor) {
                    const existingActual = await tx.actual.findUnique({
                      where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR } },
                    })
                    stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: q, year: REPORTING_YEAR, newValue: val, oldValue: existingActual ? Number(existingActual.value) : 0, tableType: 'ACTUAL' })
                  } else {
```

- [ ] **Step 6: Run the tests**

```bash
npx jest --config jest.worktree.config.ts app/api/upload/route.test.ts --no-coverage
```

Expected: 7 tests pass (5 from Task 1 + 2 new).

- [ ] **Step 7: Commit**

```bash
git add app/api/upload/route.ts app/api/upload/route.test.ts
git commit -m "fix: stage all EDITOR writes regardless of prior-row existence (oldValue=0 for new rows)"
```

---

### Task 3: Normalize `owner` at write time

**Files:**
- Modify: `lib/excel.ts` (export `normalizeAr`)
- Modify: `app/api/upload/route.ts` (import and apply `normalizeAr` to `owner`)
- Test: `app/api/upload/route.test.ts`

**Interfaces:**
- Consumes: `normalizeAr` exported from `lib/excel.ts`
- Produces: `kpiRegistry.upsert` always receives a trimmed, invisible-char-free `owner`

- [ ] **Step 1: Write the failing test**

Add to `app/api/upload/route.test.ts`:

```ts
// ── owner normalization ───────────────────────────────────────────────────────

function makeActivityBufferWithDirtyCategory(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([{
    'الوحدة التنظيمية': 'ادارة التعليم',
    'الأنشطة': 'برامج التعليم',
    '2025': 80,
    'المستهدف 2026': 100,
    '2026 Q1': 85,
    'الفئة': 'تعليم ',   // trailing space
  }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

it('ADMIN: owner is normalized (trimmed) before upsert', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  mockTx = makeTxMock(null)

  await POST(makeRequest(makeActivityBufferWithDirtyCategory(), false))

  expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
  const upsertCall = mockTx.kpiRegistry.upsert.mock.calls[0][0]
  // owner must not have trailing space
  expect(upsertCall.create.owner).toBe('تعليم')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest --config jest.worktree.config.ts app/api/upload/route.test.ts --no-coverage -t "normalized"
```

Expected: FAIL — the route currently passes `row.category` through without re-normalizing. The `upsert` will receive `'تعليم '` (with trailing space).

> Note: The Excel parser's `normalizeAr` already strips invisible Unicode chars from column *values*. The trailing space here is a plain ASCII space that `trim()` inside `normalizeAr` would catch. The test is intentionally low-tech to prove the call site is normalizing.

- [ ] **Step 3: Export `normalizeAr` from `lib/excel.ts`**

Find the function declaration:

```ts
function normalizeAr(s: string): string {
  return s.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00a0]/g, '').trim()
}
```

Change `function` to `export function`:

```ts
export function normalizeAr(s: string): string {
  return s.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00a0]/g, '').trim()
}
```

- [ ] **Step 4: Import `normalizeAr` in `app/api/upload/route.ts`**

Change:

```ts
import { isActivityFile, parseActivityFile } from '@/lib/excel'
```

To:

```ts
import { isActivityFile, parseActivityFile, normalizeAr } from '@/lib/excel'
```

- [ ] **Step 5: Apply `normalizeAr` to `owner` in the `kpiRegistry.upsert` call**

Find the upsert:

```ts
              const kpi = await tx.kpiRegistry.upsert({
                where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
                create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category, activityType: row.activityType },
                update: { activityType: row.activityType, ...(row.category ? { owner: row.category } : {}) },
              })
```

Replace with:

```ts
              const kpi = await tx.kpiRegistry.upsert({
                where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
                create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category ? normalizeAr(row.category) : undefined, activityType: row.activityType },
                update: { activityType: row.activityType, ...(row.category ? { owner: normalizeAr(row.category) } : {}) },
              })
```

- [ ] **Step 6: Run all tests**

```bash
npx jest --config jest.worktree.config.ts --no-coverage
```

Expected: all tests pass (minimum 8 in `route.test.ts` + all other suites).

- [ ] **Step 7: Run lint and type check**

```bash
npm run lint && npx tsc --noEmit
```

Expected: clean — no errors, no warnings.

- [ ] **Step 8: Commit**

```bash
git add lib/excel.ts app/api/upload/route.ts app/api/upload/route.test.ts
git commit -m "fix: normalize owner at write time to prevent duplicate donut segments"
```

---

## Final verification

- [ ] Run the full suite one last time:

```bash
npx jest --config jest.worktree.config.ts --no-coverage
```

Expected output (numbers will match your suite size):
```
Test Suites: N passed, N total
Tests:       X passed, X total
```

- [ ] Confirm no TypeScript errors:

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] Confirm no lint errors:

```bash
npm run lint
```

Expected: no output (clean).
