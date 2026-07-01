# Activity Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `cumulative` vs `monthly_variance` activity type to KPIs, so YTD totals and monthly chart values are computed correctly per activity.

**Architecture:** A single `lib/activity-config.ts` file maps `"pillar.slug"` keys to their type. A nullable `slug` column is added to `KpiRegistry`. The existing `app/api/departments/[pillar]/route.ts` is updated in two spots: per-KPI `current` value and the department-level monthly progress chart.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), Jest (ts-jest), TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `slug String?` to `KpiRegistry` |
| `lib/activity-config.ts` | Create | `ActivityType`, `ACTIVITY_TYPES` map, `getActivityType()` |
| `lib/kpi.ts` | Modify | Add `computeYtd()` utility |
| `lib/kpi.test.ts` | Modify | Tests for `computeYtd()` |
| `app/api/departments/[pillar]/route.ts` | Modify | Use activity type for `current` value + monthly chart |
| `docs/activity_rules.md` | Create | Human-readable rules for maintainers |

---

## Task 1: Add slug column to KpiRegistry

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the slug field**

Open `prisma/schema.prisma`. Inside `model KpiRegistry`, add `slug` after `owner`:

```prisma
model KpiRegistry {
  id        String    @id @default(cuid())
  nameAr    String
  pillar    Pillar
  unit      KpiUnit
  owner     String?
  slug      String?   // e.g. "total_students_enrolled" — activity part only
  targets   Target[]
  actuals   Actual[]
  createdAt DateTime  @default(now())

  @@unique([nameAr, pillar])
}
```

- [ ] **Step 2: Generate the Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Push schema to the database**

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add slug column to KpiRegistry for activity type lookup"
```

---

## Task 2: Create lib/activity-config.ts

**Files:**
- Create: `lib/activity-config.ts`

- [ ] **Step 1: Create the file**

Create `lib/activity-config.ts` with the following content:

```typescript
export type ActivityType = 'cumulative' | 'monthly_variance'

/**
 * Maps "pillar.slug" → ActivityType.
 *
 * Key format: lowercase pillar enum value + "." + KpiRegistry.slug
 * Example: "education.total_students_enrolled"
 *
 * To add an activity:
 *   1. Set KpiRegistry.slug for the record (via Prisma Studio or a seed script)
 *   2. Add an entry here
 *
 * Unknown activities fall back to 'monthly_variance' (the safer default —
 * it never incorrectly inflates a snapshot value by summing it).
 */
export const ACTIVITY_TYPES: Record<string, ActivityType> = {
  // ── Add entries here as slugs are assigned ──────────────────────────────
  // 'education.total_students_enrolled': 'cumulative',
  // 'education.active_students':         'monthly_variance',
}

/**
 * Returns the ActivityType for a KPI.
 *
 * @param pillar - The Pillar enum value in lowercase, e.g. "education"
 * @param slug   - The KpiRegistry.slug value, e.g. "total_students_enrolled"
 */
export function getActivityType(pillar: string, slug: string): ActivityType {
  return ACTIVITY_TYPES[`${pillar.toLowerCase()}.${slug}`] ?? 'monthly_variance'
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/activity-config.ts
git commit -m "feat: add activity-config with ActivityType and getActivityType helper"
```

---

## Task 3: Add computeYtd to lib/kpi.ts (TDD)

**Files:**
- Modify: `lib/kpi.test.ts`
- Modify: `lib/kpi.ts`

- [ ] **Step 1: Write the failing tests**

Open `lib/kpi.test.ts`. Add this block at the end of the file:

```typescript
import { computeYtd } from '@/lib/kpi'

describe('computeYtd', () => {
  it('returns null when no quarters have values', () => {
    expect(computeYtd({}, 'cumulative')).toBeNull()
    expect(computeYtd({}, 'monthly_variance')).toBeNull()
  })

  it('cumulative: sums all available quarters', () => {
    expect(computeYtd({ Q1: 100, Q2: 150, Q3: 60 }, 'cumulative')).toBe(310)
  })

  it('cumulative: returns single quarter value when only Q1 available', () => {
    expect(computeYtd({ Q1: 100 }, 'cumulative')).toBe(100)
  })

  it('monthly_variance: returns the last available quarter value', () => {
    expect(computeYtd({ Q1: 82, Q2: 84, Q3: 81 }, 'monthly_variance')).toBe(81)
  })

  it('monthly_variance: returns Q1 when only Q1 available', () => {
    expect(computeYtd({ Q1: 250 }, 'monthly_variance')).toBe(250)
  })

  it('monthly_variance: handles non-sequential quarters (uses last defined)', () => {
    // Q1 present, Q2 missing, Q3 present — last defined in order is Q3
    expect(computeYtd({ Q1: 100, Q3: 110 }, 'monthly_variance')).toBe(110)
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx jest lib/kpi.test.ts --no-coverage
```

Expected: FAIL — `computeYtd is not exported from '@/lib/kpi'`

- [ ] **Step 3: Implement computeYtd in lib/kpi.ts**

Open `lib/kpi.ts`. Add this import at the top:

```typescript
import type { ActivityType } from '@/lib/activity-config'
```

Then add this function at the end of the file:

```typescript
/**
 * Computes the YTD value from available quarterly actuals.
 *
 * cumulative    → sum of all quarters present
 * monthly_variance → value of the last quarter present (in Q1–Q4 order)
 *
 * Returns null if no quarters have data.
 */
export function computeYtd(
  quarters: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>>,
  type: ActivityType
): number | null {
  const ordered = (['Q1', 'Q2', 'Q3', 'Q4'] as const)
    .map(q => quarters[q])
    .filter((v): v is number => v != null)

  if (ordered.length === 0) return null

  return type === 'cumulative'
    ? ordered.reduce((a, b) => a + b, 0)
    : ordered[ordered.length - 1]
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/kpi.test.ts --no-coverage
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/kpi.ts lib/kpi.test.ts
git commit -m "feat: add computeYtd utility to lib/kpi with TDD tests"
```

---

## Task 4: Update route.ts — per-KPI current value

**Files:**
- Modify: `app/api/departments/[pillar]/route.ts` (lines 1–5 imports, lines 109–114 current value logic)

Currently the `current` value for each KPI (shown on progress bars) uses a unit-based heuristic: PERCENT = average quarters, otherwise = sum quarters. This task replaces that with activity-type-aware logic.

- [ ] **Step 1: Add imports at the top of the route**

Open `app/api/departments/[pillar]/route.ts`. The current imports are:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Pillar } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { DeptData } from '@/types/department'
```

Replace with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Pillar } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getActivityType } from '@/lib/activity-config'
import { computeYtd } from '@/lib/kpi'
import type { DeptData } from '@/types/department'
```

- [ ] **Step 2: Replace the current-value logic inside the currentTargets map**

Find this block (around lines 109–114):

```typescript
        // current: cumulative sum for COUNT/CURRENCY; average rate for PERCENT
        const nonNull = quarters.map(q => q.actual).filter((v): v is number => v !== null)
        const current = nonNull.length === 0
          ? 0
          : isKpiPercent
            ? Math.round(nonNull.reduce((s, v) => s + v, 0) / nonNull.length)
            : nonNull.reduce((s, v) => s + v, 0)
```

Replace it with:

```typescript
        // current: use activity type to decide cumulative sum vs latest snapshot
        const actType = k.slug ? getActivityType(k.pillar, k.slug) : 'monthly_variance'
        const quarterMap: Partial<Record<'Q1'|'Q2'|'Q3'|'Q4', number>> = {}
        for (const qp of quarters) {
          if (qp.actual !== null) quarterMap[qp.q] = qp.actual
        }
        const ytd = computeYtd(quarterMap, actType)
        const current = ytd !== null ? Math.round(ytd) : 0
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/departments/[pillar]/route.ts
git commit -m "feat: use activity type for per-KPI YTD current value in department API"
```

---

## Task 5: Update route.ts — monthly progress chart

**Files:**
- Modify: `app/api/departments/[pillar]/route.ts` (lines 127–144 monthly progress block)

Currently the monthly progress chart only uses Q1 data, spreading it across Jan–Mar. This task replaces that with a full multi-quarter approach that respects activity type.

- [ ] **Step 1: Replace the monthly progress block**

Find this block (around lines 127–144):

```typescript
    // Monthly progress 2026: Q1 actual spread across Jan-Mar, null for future months
    const q1Vals = kpis
      .map(k => k.actuals.find(a => a.year === 2026 && a.period === 'Q1')?.value ?? null)
      .filter((v): v is number => v !== null)
    const q1Avg = q1Vals.length ? q1Vals.reduce((s, v) => s + v, 0) / q1Vals.length : null
    const annualTargetAvg = currentTargets.length
      ? currentTargets.reduce((s, t) => s + t.target, 0) / currentTargets.length
      : 0
    // For PERCENT KPIs, monthly target = annual target (rate doesn't divide by month)
    // For COUNT/CURRENCY, divide by 12
    const monthlyTarget = isPercent
      ? Math.max(Math.round(annualTargetAvg), 1)
      : Math.max(Math.round(annualTargetAvg / 12), 1)

    const monthlyProgress = MONTHS.map((month, i) => ({
      month,
      actual: i < 3 && q1Avg !== null ? Math.round(q1Avg) : null,
      target: monthlyTarget,
    }))
```

Replace it with:

```typescript
    // Monthly progress 2026: spread all available quarters across their months.
    // Cumulative KPIs show a running total; snapshot KPIs show that quarter's value.
    // We compute per-KPI monthly values then average across KPIs.
    const perKpiMonthly: (number | null)[][] = kpis.map(k => {
      const actType = k.slug ? getActivityType(k.pillar, k.slug) : 'monthly_variance'
      const qVals: Partial<Record<string, number>> = {}
      for (const q of QUARTERS) {
        const a = k.actuals.find(x => x.year === 2026 && x.period === q)
        if (a) qVals[q] = Number(a.value)
      }
      return MONTHS.map((_, i) => {
        const qIdx = Math.floor(i / 3)       // 0=Q1, 1=Q2, 2=Q3, 3=Q4
        const qKey = QUARTERS[qIdx]
        if (!(qKey in qVals)) return null    // quarter not yet available
        if (actType === 'cumulative') {
          // Running total: sum all quarters up to and including this one
          let total = 0
          for (let j = 0; j <= qIdx; j++) {
            const v = qVals[QUARTERS[j]]
            if (v === undefined) return null // gap in data — can't compute running total
            total += v
          }
          return total
        } else {
          return qVals[qKey] ?? null
        }
      })
    })

    const annualTargetAvg = currentTargets.length
      ? currentTargets.reduce((s, t) => s + t.target, 0) / currentTargets.length
      : 0
    const monthlyTarget = isPercent
      ? Math.max(Math.round(annualTargetAvg), 1)
      : Math.max(Math.round(annualTargetAvg / 12), 1)

    const monthlyProgress = MONTHS.map((month, i) => {
      const vals = perKpiMonthly.map(kpiMonths => kpiMonths[i]).filter((v): v is number => v !== null)
      return {
        month,
        actual: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null,
        target: monthlyTarget,
      }
    })
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run existing tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git add app/api/departments/[pillar]/route.ts
git commit -m "feat: use activity type for monthly progress chart in department API"
```

---

## Task 6: Create docs/activity_rules.md

**Files:**
- Create: `docs/activity_rules.md`

- [ ] **Step 1: Create the file**

Create `docs/activity_rules.md`:

```markdown
# Activity Types

Activities fall into one of two types. The type is set in `lib/activity-config.ts`
and looked up at runtime using the KPI's `pillar` + `slug` fields.

---

## cumulative

Values accumulate across quarters. YTD = sum of all quarters received.

**Example:**

| Quarter | Value | YTD  |
|---------|-------|------|
| Q1      | 120   | 120  |
| Q2      | 150   | 270  |
| Q3      | 60    | 330  |

**Use for:** total learners, certificates issued, programs delivered, robots deployed.

---

## monthly_variance

Each quarter is an independent snapshot. YTD = latest quarter's value.
Month-over-month change = current quarter − previous quarter.

**Example:**

| Quarter | Value | YTD (= latest) |
|---------|-------|----------------|
| Q1      | 250   | 250            |
| Q2      | 245   | 245            |
| Q3      | 260   | 260            |

**Use for:** active users, satisfaction scores, open projects, headcount.

---

## Adding or changing an activity type

1. Assign a `slug` to the `KpiRegistry` record (via Prisma Studio or a seed script).
   Format: lowercase English words separated by underscores, e.g. `total_students_enrolled`.

2. Add an entry to `ACTIVITY_TYPES` in `lib/activity-config.ts`:
   ```typescript
   'education.total_students_enrolled': 'cumulative',
   ```
   Key format: `"pillar_enum_lowercase.slug"`

3. Activities without a slug, or with a slug not in the config, default to `monthly_variance`.

---

## Default fallback

Unknown activities → `monthly_variance`.

This is the safe default: a snapshot value is never inflated by being summed.
If in doubt, leave the activity out of the config until the type is confirmed.
```

- [ ] **Step 2: Commit**

```bash
git add docs/activity_rules.md
git commit -m "docs: add activity_rules.md explaining cumulative vs monthly_variance types"
```

---

## Task 7: Smoke test the API

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Hit a department endpoint**

In a browser or curl:

```
http://localhost:3000/api/departments/EDUCATION
```

Expected: a valid JSON response with `lastYear` and `currentYear` keys — no 500 errors.

- [ ] **Step 3: Confirm monthly progress shape**

In the JSON response, check `currentYear.monthlyProgress`:
- Should be an array of 12 objects with `{ month, actual, target }`
- Months with no quarterly data should have `actual: null`
- Months that have a quarter's data should have a numeric `actual`

- [ ] **Step 4: Stop the server and run all tests one final time**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 5: Run the linter**

```bash
npm run lint
```

Expected: no errors
