# Activity Type Design

**Date:** 2026-06-30
**Status:** Approved
**Scope:** Add cumulative vs monthly_variance activity types that govern YTD aggregation and chart data generation

---

## Problem

The dashboard treats all activities identically when computing YTD totals and monthly chart values. This is wrong for two distinct categories of activities:

- **Cumulative** activities grow over time (e.g. total learners, certificates issued) — their YTD should be the *sum* of all quarters received.
- **Snapshot** activities represent a point-in-time state (e.g. satisfaction scores, active users) — their YTD should be the *latest* quarter's value, not a sum.

---

## Decision

Encode the activity type in a hardcoded TypeScript config file (`lib/activity-config.ts`). The config is keyed by `"pillar.english-slug"` which must match `KpiRegistry.slug` (a new nullable column). Unknown activities default to `monthly_variance`.

Data remains quarterly (Q1–Q4). No changes to the upload flow or API response shape.

---

## Config File

**`lib/activity-config.ts`** — new file, single source of truth:

```typescript
export type ActivityType = 'cumulative' | 'monthly_variance'

export const ACTIVITY_TYPES: Record<string, ActivityType> = {
  // Format: 'pillar.english-slug': 'cumulative' | 'monthly_variance'
  // slug must match KpiRegistry.slug
}

export function getActivityType(pillar: string, slug: string): ActivityType {
  return ACTIVITY_TYPES[`${pillar}.${slug}`] ?? 'monthly_variance'
}
```

Default fallback is `monthly_variance` — the safer assumption (avoids incorrectly inflating snapshot values by summing them).

---

## Schema Change

Add a nullable `slug` column to `KpiRegistry` in `prisma/schema.prisma`:

```prisma
model KpiRegistry {
  // existing fields ...
  slug String? // e.g. "total_students_enrolled" (activity part only — pillar comes from the existing pillar field)
}
```

The config key is constructed at lookup time as `${kpi.pillar.toLowerCase()}.${kpi.slug}`. No existing data is affected. The slug is populated manually or via a future seed script.

---

## YTD Computation

A new `computeYtd()` utility in `lib/kpi.ts`:

```typescript
export function computeYtd(
  quarters: Partial<Record<'Q1'|'Q2'|'Q3'|'Q4', number>>,
  type: ActivityType
): number | null {
  const values = (['Q1','Q2','Q3','Q4'] as const)
    .map(q => quarters[q])
    .filter((v): v is number => v != null)
  if (!values.length) return null
  return type === 'cumulative'
    ? values.reduce((a, b) => a + b, 0)
    : values[values.length - 1]
}
```

Applied in `app/api/departments/[pillar]/route.ts` for both 2025 annual totals and 2026 YTD values.

---

## Monthly Chart Data

The quarterly-to-monthly distribution in `app/api/departments/[pillar]/route.ts` changes per type:

**Cumulative** — each month shows the running total up to that quarter:
```
Q1=120, Q2=150 → Jan=120, Feb=120, Mar=120, Apr=270, May=270, Jun=270
```

**Monthly variance** — each month shows the quarter's snapshot value (current behavior):
```
Q1=82, Q2=84 → Jan=82, Feb=82, Mar=82, Apr=84, May=84, Jun=84
```

The `MonthlyProgressPoint` type is unchanged. No frontend components are modified.

---

## Documentation

**`docs/activity_rules.md`** — new file, human-readable reference:

```markdown
# Activity Types

Activities fall into one of two types, defined in `lib/activity-config.ts`.

## cumulative
Values accumulate across quarters. YTD = sum of all quarters received.
Use for: total learners, certificates issued, programs delivered.

## monthly_variance
Each quarter is an independent snapshot. YTD = latest quarter's value.
Use for: active users, satisfaction scores, open projects, headcount.

## Adding a new activity
1. Add a row to `ACTIVITY_TYPES` in `lib/activity-config.ts`
2. Key format: "pillar.english-slug" — must match KpiRegistry.slug
3. Unknown activities default to monthly_variance
```

---

## Files Changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add nullable `slug String?` to `KpiRegistry` |
| `lib/activity-config.ts` | **New** — type map + `getActivityType()` |
| `lib/kpi.ts` | Add `computeYtd()` utility |
| `app/api/departments/[pillar]/route.ts` | Use `getActivityType()` + `computeYtd()` for 2025 and 2026 |
| `docs/activity_rules.md` | **New** — human-readable rules reference |

No breaking changes. No frontend component changes. API response shape is unchanged.

---

## What Does NOT Change

- Upload flow and Excel parsing
- KPI variance color logic (`lib/kpi.ts` existing logic)
- API response types (`MonthlyProgressPoint`, `DeptData`)
- Frontend chart components
- RBAC or auth middleware
