# Staging Integrity — Sub-project A Design

> **Date:** 2026-11-07  
> **Branch:** worktree-fix+remediation-2dfd8da  
> **Addresses audit issues:** #3 (first-write staging bypass), #4 (legacy format bypass), #7 (owner normalization)

---

## Goal

Ensure that every EDITOR write goes through the approval queue — no EDITOR data reaches the live `Actual` or `Target` tables without an ADMIN reviewing it first.

## Background

The upload route has two code paths and three staging gaps:

- **Gap #3:** When an EDITOR uploads a value for a period that has no prior row (`findUnique` returns `null`), the code falls into an `else` branch that writes directly to the live table, bypassing `stagingRows`. This affects `target2026`, `actual2025`, and each quarterly actual.
- **Gap #4:** The legacy Excel format (`parseExcelFile`, identified by the absence of an `الأنشطة` column) routes to a completely separate branch that calls `actual.create` directly for all rows, with no staging and no EDITOR guard for novel periods. Any EDITOR with an `assignedPillarId` can use this path to write directly to `Actual`.
- **Gap #7:** `KpiRegistry.owner` is written from `row.category` without re-normalizing, allowing invisible Unicode or trailing spaces to create duplicate donut segments.

## Architecture

All changes are confined to two files:

- **`lib/excel.ts`** — remove the legacy parser functions
- **`app/api/upload/route.ts`** — remove the legacy branch, fix the three EDITOR `else` bypasses, normalize `owner`

One type cleanup:

- **`types/index.ts`** — remove `UploadRow` and `UploadValidationResult` (used only by the legacy parser)

## Detailed Changes

### 1. Remove the legacy format

**`lib/excel.ts`:** Delete `normalizeRow`, `validateRow`, and `parseExcelFile`. Keep `isActivityFile`, `parseActivityFile`, `normalizeAr`, `getCol`, `toNum`, `DEPT_NAME_TO_PILLAR`, `QUARTER_COL`, `ACTIVITY_TYPE_MAP`.

**`app/api/upload/route.ts`:** The route currently reads:
```
if (isActivityFile(buffer)) {
  // ... activity path ...
  return NextResponse.json(...)
}

// Legacy path starts here
const { valid, errors } = parseExcelFile(buffer)
// ... legacy path ...
return NextResponse.json(...)
```

Replace the legacy path with a single early return:
```ts
// After isActivityFile() returns false:
return NextResponse.json(
  { error: 'صيغة الملف غير مدعومة. استخدم قالب رفع النشاط' },
  { status: 400 }
)
```

**`types/index.ts`:** Remove `UploadRow`, `UploadValidationResult`. Remove the `import type { UploadRow, UploadValidationResult, ... }` line from `lib/excel.ts` import (keeping `ActivityRow`, `ActivityUploadResult`).

### 2. Fix EDITOR first-write staging bypass

Inside the activity path transaction loop, the EDITOR branches for `target2026`, `actual2025`, and each quarterly actual currently read:

```ts
if (isEditor) {
  const existing = await tx.X.findUnique({ where: { ... } })
  if (existing) {
    stagingRows.push({ ..., oldValue: existing.value })   // ← correct
  } else {
    await tx.X.upsert(...)                                // ← bypass: writes live
  }
} else {
  await tx.X.upsert(...)   // ADMIN — always writes live, correct
}
```

Fix: remove the `else` branch for EDITORs in all three locations. When `existing` is `null`, stage with `oldValue: 0`:

```ts
if (isEditor) {
  const existing = await tx.X.findUnique({ where: { ... } })
  stagingRows.push({
    ...,
    oldValue: existing ? Number(existing.value) : 0,
  })
} else {
  await tx.X.upsert(...)   // ADMIN path unchanged
}
```

`oldValue: 0` is accurate: the admin review panel will show "0 → newValue", which correctly describes a new entry.

The three locations are:
- `target2026` block (~line 129)
- `actual2025` block (~line 152)
- quarterly actuals loop (~line 177)

### 3. Normalize `owner` at write time

In the `kpiRegistry.upsert` call, change:

```ts
// before
create: { ..., owner: row.category, ... },
update: { ..., ...(row.category ? { owner: row.category } : {}) },

// after
create: { ..., owner: row.category ? normalizeAr(row.category) : undefined, ... },
update: { ..., ...(row.category ? { owner: normalizeAr(row.category) } : {}) },
```

`normalizeAr` is already defined in `lib/excel.ts` and used throughout the parser. This is a one-line change per branch.

## Tests

### `app/api/upload/route.test.ts`

**Replace** any test covering the legacy path with:

```ts
it('returns 400 for legacy-format files (no الأنشطة column)', async () => {
  // mock isActivityFile to return false
  const res = await POST(legacyFileRequest())
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toMatch('صيغة الملف غير مدعومة')
})
```

**Add** two new EDITOR staging cases:

```ts
it('EDITOR: new period (no prior row) goes to stagingRows, not live table', async () => {
  // mock: existing KPI found, no existing Actual for the period
  // expect: stagingRows.push called with oldValue: 0
  // expect: tx.actual.upsert NOT called
})

it('EDITOR: existing period goes to stagingRows with correct oldValue', async () => {
  // mock: existing KPI found, existing Actual.value = 50
  // expect: stagingRows.push called with oldValue: 50
  // expect: tx.actual.upsert NOT called
})
```

## Files Changed

| File | Action |
|---|---|
| `lib/excel.ts` | Remove `normalizeRow`, `validateRow`, `parseExcelFile` |
| `app/api/upload/route.ts` | Remove legacy branch; fix 3 EDITOR `else` bypasses; normalize `owner` |
| `types/index.ts` | Remove `UploadRow`, `UploadValidationResult` |
| `app/api/upload/route.test.ts` | Replace legacy test; add 2 new EDITOR staging tests |

## Out of Scope

- Schema changes (Sub-project B)
- Admin KPI creation UI (Sub-project C)
- `take:500` pagination (Sub-project D)

## Success Criteria

1. A legacy-format file uploaded by any role returns 400.
2. An EDITOR uploading a value for a period with no prior row produces a `SubmissionRow` with `oldValue: 0` — no row in `Actual`/`Target` until approved.
3. An EDITOR uploading a value for an existing period produces a `SubmissionRow` with the correct `oldValue` — same as before.
4. All existing upload tests pass. New tests pass. `npm run lint`, `npx tsc --noEmit`, `npm test` all clean.
