# Activity Card Redesign — Option B (Horizontal Bars)

**Date:** 2026-05-20  
**Status:** Approved

---

## Goal

Replace the existing `ProgressCard` in `CurrentYearTracker` with a richer card that combines last year's actual, current year quarterly breakdown (Q1–Q4), and a cumulative progress bar vs the annual target — all in a single card per activity.

---

## Data Shape

### `types/department.ts` — extend `TargetProgress`

Add two fields:

```ts
export interface QuarterActual {
  q: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  actual: number | null   // null = not yet available
  target: number          // quarterly target (annual ÷ 4 for COUNT; annual for PERCENT)
}

export interface TargetProgress {
  labelAr: string
  target: number            // annual target
  current: number           // cumulative actual so far (sum of available quarters)
  unit: string
  lowerIsBetter?: boolean
  lastYearValue: number | null   // NEW — 2025 annual actual
  quarters: QuarterActual[]      // NEW — Q1–Q4 for current year
}
```

---

## API Change

**File:** `app/api/departments/[pillar]/route.ts`

In the `currentTargets` mapping loop, for each KPI:
- Read the 2025 `ANNUAL` actual → `lastYearValue`
- Read Q1–Q4 actuals for 2026 → `quarters[]`, each with its actual (or null) and its target
  - For `PERCENT` KPIs: quarterly target = annual target (it's a rate)
  - For `COUNT` / `CURRENCY` KPIs: quarterly target = `Math.round(annualTarget / 4)`
- `current` = sum of non-null quarter actuals (replaces the current "latest quarter" logic)

No new Prisma queries needed — actuals for 2025 and 2026 are already fetched.

---

## Component Change

**File:** `components/department/CurrentYearTracker.tsx`

Replace `ProgressCard` with `ActivityCard` (same file, renamed internal component).

### Layout — Option B

```
┌─────────────────────────────────────────┐
│ header band (light bg)                  │
│   activity name (right-aligned, Arabic) │
├─────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────────────┐ │
│  │  2025      │  │  2026 حتى الآن     │ │
│  │  2,840     │  │  1,360             │ │  ← two-column stat box
│  └────────────┘  └────────────────────┘ │
│                                         │
│  Q1  ████████████░░░░░░░░░  640        │
│  Q2  ██████████████████░░░  720        │  ← horizontal bar per quarter
│  Q3  ░░░░░░░░░░░░░░░░░░░░░  —          │
│  Q4  ░░░░░░░░░░░░░░░░░░░░░  —          │
│                                         │
│  ─────────────────────────────────────  │
│  المستهدف السنوي: 3,200    43% منجز   │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░  │  ← footer progress bar
└─────────────────────────────────────────┘
```

**Color rules:**
- Each quarter gets a fixed color: Q1 indigo, Q2 cyan, Q3 amber, Q4 green
- Future quarters (null actual) render grey empty bars
- Footer bar color follows KPI variance: green ≥ 95%, amber ≥ 80%, red < 80%
- 2025 stat box: muted text; 2026 stat box: accent background tint + colored border

**`lowerIsBetter` support:**  
For activities where lower is better, the progress % is `target / actual * 100` — same logic as before, applied per quarter and for the footer bar.

---

## Static Data Files

**Files:** `data/departments/*.ts` (7 files)

Each `targets[]` entry needs `lastYearValue` and `quarters` added. Source values:
- `lastYearValue` — copy from the corresponding `lastYear.kpis[].value`
- `quarters` — distribute the annual target evenly (÷4 for COUNT; same for PERCENT), set Q1/Q2 actuals from `lastYear.quarterlyComparison` as a reasonable placeholder until real data is uploaded

---

## What Does NOT Change

- `DepartmentDashboard.tsx` — no changes; it passes `data.currentYear` to `CurrentYearTracker` unchanged
- `LastYearReview.tsx` — untouched
- `InsightsPanel.tsx` — untouched
- Monthly chart inside `CurrentYearTracker` — kept as-is below the cards
- The demo mockup page `app/demo/card-mockup/page.tsx` — to be deleted after implementation

---

## Files Touched

| File | Change |
|------|--------|
| `types/department.ts` | Add `QuarterActual`, extend `TargetProgress` |
| `app/api/departments/[pillar]/route.ts` | Populate `lastYearValue` + `quarters` in `currentTargets` |
| `components/department/CurrentYearTracker.tsx` | Replace `ProgressCard` with `ActivityCard` (Option B layout) |
| `data/departments/education.ts` | Add `lastYearValue` + `quarters` to each target |
| `data/departments/family-culture.ts` | Same |
| `data/departments/islamic-info-center.ts` | Same |
| `data/departments/al-birr-male.ts` | Same |
| `data/departments/al-birr-female.ts` | Same |
| `data/departments/orphans.ts` | Same |
| `data/departments/scientific-programs.ts` | Same |
| `app/demo/card-mockup/page.tsx` | Delete |
