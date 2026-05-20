# Activity Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `ProgressCard` in department dashboards with a richer `ActivityCard` (Option B) that shows last year's actual, quarterly progress bars (Q1–Q4), and a cumulative vs annual-target progress bar in the footer.

**Architecture:** Extend the `TargetProgress` type with `lastYearValue` and `quarters[]`, populate both from the existing Prisma query in the API route, update all 7 static fallback data files, then replace the component. No new API endpoints or Prisma queries needed.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Prisma (already wired)

---

## File Map

| File | Change |
|------|--------|
| `types/department.ts` | Add `QuarterActual` interface; extend `TargetProgress` |
| `data/departments/education.ts` | Add `lastYearValue` + `quarters` to every target entry |
| `data/departments/family-culture.ts` | Same |
| `data/departments/islamic-info-center.ts` | Same |
| `data/departments/al-birr-male.ts` | Same |
| `data/departments/al-birr-female.ts` | Same |
| `data/departments/orphans.ts` | Same |
| `data/departments/scientific-programs.ts` | Same |
| `app/api/departments/[pillar]/route.ts` | Populate `lastYearValue` + `quarters` in `currentTargets`; derive `current` from quarter sum/avg |
| `components/department/CurrentYearTracker.tsx` | Replace `ProgressCard` with `ActivityCard` |
| `app/demo/card-mockup/page.tsx` | Delete |

---

## Task 1: Extend types and update all static data files

These two changes are coupled — updating the type immediately makes the static files fail TypeScript, so do both in one commit.

**Files:**
- Modify: `types/department.ts`
- Modify: `data/departments/education.ts`
- Modify: `data/departments/family-culture.ts`
- Modify: `data/departments/islamic-info-center.ts`
- Modify: `data/departments/al-birr-male.ts`
- Modify: `data/departments/al-birr-female.ts`
- Modify: `data/departments/orphans.ts`
- Modify: `data/departments/scientific-programs.ts`

- [ ] **Step 1: Update `types/department.ts`**

Replace the entire file content:

```ts
// Shared data-shape types for all department dashboard pages.
// Every dept data file must export an object that satisfies DeptData.

export interface DeptKpiStat {
  labelAr: string
  value: number
  unit: string          // '', '%', 'hrs', etc.
  icon: string          // lucide-react icon name
}

export interface MonthlyPoint {
  month: string         // 'Jan'…'Dec'
  value: number | null  // null = not yet available
}

export interface CategorySlice {
  nameAr: string
  value: number         // absolute count or %
}

export interface QuarterlyPoint {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  achieved: number
  target: number
}

export interface QuarterActual {
  q: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  actual: number | null   // null = not yet available
  target: number          // quarterly target
}

export interface TargetProgress {
  labelAr: string
  target: number            // annual target
  current: number           // cumulative actual (sum for COUNT; latest for PERCENT)
  unit: string
  lowerIsBetter?: boolean
  lastYearValue: number | null   // 2025 annual actual
  quarters: QuarterActual[]      // Q1–Q4 breakdown for current year
}

export interface MonthlyProgressPoint {
  month: string
  actual: number | null   // null for future months
  target: number
}

export interface DeptData {
  lastYear: {
    year: number
    kpis: DeptKpiStat[]
    monthlyActivity: MonthlyPoint[]
    categoryBreakdown: CategorySlice[]
    quarterlyComparison: QuarterlyPoint[]
  }
  currentYear: {
    year: number
    targets: TargetProgress[]
    monthlyProgress: MonthlyProgressPoint[]
  }
}
```

- [ ] **Step 2: Update `data/departments/education.ts` targets**

Replace only the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'الطلاب المسجلون', target: 3200, current: 1540, unit: '',
        lastYearValue: 2840,
        quarters: [
          { q: 'Q1', actual: 770,  target: 800 },
          { q: 'Q2', actual: 770,  target: 800 },
          { q: 'Q3', actual: null, target: 800 },
          { q: 'Q4', actual: null, target: 800 },
        ],
      },
      {
        labelAr: 'البرامج المنفذة', target: 55, current: 18, unit: '',
        lastYearValue: 47,
        quarters: [
          { q: 'Q1', actual: 9,    target: 14 },
          { q: 'Q2', actual: 9,    target: 14 },
          { q: 'Q3', actual: null, target: 14 },
          { q: 'Q4', actual: null, target: 14 },
        ],
      },
      {
        labelAr: 'معدل الإتمام', target: 90, current: 86, unit: '%',
        lastYearValue: 84,
        quarters: [
          { q: 'Q1', actual: 86,   target: 90 },
          { q: 'Q2', actual: 86,   target: 90 },
          { q: 'Q3', actual: null, target: 90 },
          { q: 'Q4', actual: null, target: 90 },
        ],
      },
      {
        labelAr: 'رضا المستفيدين', target: 93, current: 92, unit: '%',
        lastYearValue: 91,
        quarters: [
          { q: 'Q1', actual: 92,   target: 93 },
          { q: 'Q2', actual: 92,   target: 93 },
          { q: 'Q3', actual: null, target: 93 },
          { q: 'Q4', actual: null, target: 93 },
        ],
      },
    ],
```

- [ ] **Step 3: Update `data/departments/family-culture.ts` targets**

Replace the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'الجلسات الأسرية', target: 360, current: 168, unit: '',
        lastYearValue: 312,
        quarters: [
          { q: 'Q1', actual: 84,   target: 90 },
          { q: 'Q2', actual: 84,   target: 90 },
          { q: 'Q3', actual: null, target: 90 },
          { q: 'Q4', actual: null, target: 90 },
        ],
      },
      {
        labelAr: 'المستفيدون', target: 5000, current: 2290, unit: '',
        lastYearValue: 4180,
        quarters: [
          { q: 'Q1', actual: 1145, target: 1250 },
          { q: 'Q2', actual: 1145, target: 1250 },
          { q: 'Q3', actual: null, target: 1250 },
          { q: 'Q4', actual: null, target: 1250 },
        ],
      },
      {
        labelAr: 'معدل المشاركة', target: 92, current: 90, unit: '%',
        lastYearValue: 88,
        quarters: [
          { q: 'Q1', actual: 90,   target: 92 },
          { q: 'Q2', actual: 90,   target: 92 },
          { q: 'Q3', actual: null, target: 92 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
      {
        labelAr: 'رضا المستفيدين', target: 95, current: 94, unit: '%',
        lastYearValue: 93,
        quarters: [
          { q: 'Q1', actual: 94,   target: 95 },
          { q: 'Q2', actual: 94,   target: 95 },
          { q: 'Q3', actual: null, target: 95 },
          { q: 'Q4', actual: null, target: 95 },
        ],
      },
    ],
```

- [ ] **Step 4: Update `data/departments/islamic-info-center.ts` targets**

Replace the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'الاستفسارات المجابة', target: 10000, current: 4320, unit: '',
        lastYearValue: 8640,
        quarters: [
          { q: 'Q1', actual: 2160,  target: 2500 },
          { q: 'Q2', actual: 2160,  target: 2500 },
          { q: 'Q3', actual: null,  target: 2500 },
          { q: 'Q4', actual: null,  target: 2500 },
        ],
      },
      {
        labelAr: 'المطبوعات الصادرة', target: 150, current: 52, unit: '',
        lastYearValue: 124,
        quarters: [
          { q: 'Q1', actual: 26,   target: 38 },
          { q: 'Q2', actual: 26,   target: 38 },
          { q: 'Q3', actual: null, target: 38 },
          { q: 'Q4', actual: null, target: 38 },
        ],
      },
      {
        labelAr: 'الزوار الرقميون', target: 65000, current: 26200, unit: '',
        lastYearValue: 52400,
        quarters: [
          { q: 'Q1', actual: 13100, target: 16250 },
          { q: 'Q2', actual: 13100, target: 16250 },
          { q: 'Q3', actual: null,  target: 16250 },
          { q: 'Q4', actual: null,  target: 16250 },
        ],
      },
      {
        labelAr: 'دقة المعلومات', target: 98, current: 97, unit: '%',
        lastYearValue: 97,
        quarters: [
          { q: 'Q1', actual: 97,   target: 98 },
          { q: 'Q2', actual: 97,   target: 98 },
          { q: 'Q3', actual: null, target: 98 },
          { q: 'Q4', actual: null, target: 98 },
        ],
      },
    ],
```

- [ ] **Step 5: Update `data/departments/al-birr-male.ts` targets**

Replace the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'المستفيدون (ذكور)', target: 2200, current: 860, unit: '',
        lastYearValue: 1860,
        quarters: [
          { q: 'Q1', actual: 430,  target: 550 },
          { q: 'Q2', actual: 430,  target: 550 },
          { q: 'Q3', actual: null, target: 550 },
          { q: 'Q4', actual: null, target: 550 },
        ],
      },
      {
        labelAr: 'البرامج المنفذة', target: 48, current: 14, unit: '',
        lastYearValue: 38,
        quarters: [
          { q: 'Q1', actual: 7,    target: 12 },
          { q: 'Q2', actual: 7,    target: 12 },
          { q: 'Q3', actual: null, target: 12 },
          { q: 'Q4', actual: null, target: 12 },
        ],
      },
      {
        labelAr: 'نسبة التغطية', target: 85, current: 74, unit: '%',
        lastYearValue: 78,
        quarters: [
          { q: 'Q1', actual: 74,   target: 85 },
          { q: 'Q2', actual: 74,   target: 85 },
          { q: 'Q3', actual: null, target: 85 },
          { q: 'Q4', actual: null, target: 85 },
        ],
      },
      {
        labelAr: 'رضا المستفيدين', target: 92, current: 88, unit: '%',
        lastYearValue: 89,
        quarters: [
          { q: 'Q1', actual: 88,   target: 92 },
          { q: 'Q2', actual: 88,   target: 92 },
          { q: 'Q3', actual: null, target: 92 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
    ],
```

- [ ] **Step 6: Update `data/departments/al-birr-female.ts` targets**

Replace the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'المستفيدات (إناث)', target: 2600, current: 1020, unit: '',
        lastYearValue: 2140,
        quarters: [
          { q: 'Q1', actual: 510,  target: 650 },
          { q: 'Q2', actual: 510,  target: 650 },
          { q: 'Q3', actual: null, target: 650 },
          { q: 'Q4', actual: null, target: 650 },
        ],
      },
      {
        labelAr: 'البرامج المنفذة', target: 52, current: 18, unit: '',
        lastYearValue: 44,
        quarters: [
          { q: 'Q1', actual: 9,    target: 13 },
          { q: 'Q2', actual: 9,    target: 13 },
          { q: 'Q3', actual: null, target: 13 },
          { q: 'Q4', actual: null, target: 13 },
        ],
      },
      {
        labelAr: 'نسبة التغطية', target: 88, current: 80, unit: '%',
        lastYearValue: 82,
        quarters: [
          { q: 'Q1', actual: 80,   target: 88 },
          { q: 'Q2', actual: 80,   target: 88 },
          { q: 'Q3', actual: null, target: 88 },
          { q: 'Q4', actual: null, target: 88 },
        ],
      },
      {
        labelAr: 'رضا المستفيدات', target: 96, current: 93, unit: '%',
        lastYearValue: 94,
        quarters: [
          { q: 'Q1', actual: 93,   target: 96 },
          { q: 'Q2', actual: 93,   target: 96 },
          { q: 'Q3', actual: null, target: 96 },
          { q: 'Q4', actual: null, target: 96 },
        ],
      },
    ],
```

- [ ] **Step 7: Update `data/departments/orphans.ts` targets**

Replace the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'الأيتام المسجلون', target: 720, current: 340, unit: '',
        lastYearValue: 680,
        quarters: [
          { q: 'Q1', actual: 170,  target: 180 },
          { q: 'Q2', actual: 170,  target: 180 },
          { q: 'Q3', actual: null, target: 180 },
          { q: 'Q4', actual: null, target: 180 },
        ],
      },
      {
        labelAr: 'الكفلاء النشطون', target: 580, current: 268, unit: '',
        lastYearValue: 524,
        quarters: [
          { q: 'Q1', actual: 134,  target: 145 },
          { q: 'Q2', actual: 134,  target: 145 },
          { q: 'Q3', actual: null, target: 145 },
          { q: 'Q4', actual: null, target: 145 },
        ],
      },
      {
        labelAr: 'البرامج التربوية', target: 36, current: 14, unit: '',
        lastYearValue: 29,
        quarters: [
          { q: 'Q1', actual: 7,    target: 9 },
          { q: 'Q2', actual: 7,    target: 9 },
          { q: 'Q3', actual: null, target: 9 },
          { q: 'Q4', actual: null, target: 9 },
        ],
      },
      {
        labelAr: 'نسبة التغطية', target: 98, current: 96, unit: '%',
        lastYearValue: 96,
        quarters: [
          { q: 'Q1', actual: 96,   target: 98 },
          { q: 'Q2', actual: 96,   target: 98 },
          { q: 'Q3', actual: null, target: 98 },
          { q: 'Q4', actual: null, target: 98 },
        ],
      },
    ],
```

- [ ] **Step 8: Update `data/departments/scientific-programs.ts` targets**

Replace the `targets` array inside `currentYear`:

```ts
    targets: [
      {
        labelAr: 'البحوث المنجزة', target: 24, current: 7, unit: '',
        lastYearValue: 18,
        quarters: [
          { q: 'Q1', actual: 4,    target: 6 },
          { q: 'Q2', actual: 3,    target: 6 },
          { q: 'Q3', actual: null, target: 6 },
          { q: 'Q4', actual: null, target: 6 },
        ],
      },
      {
        labelAr: 'المنح الدراسية', target: 80, current: 28, unit: '',
        lastYearValue: 63,
        quarters: [
          { q: 'Q1', actual: 14,   target: 20 },
          { q: 'Q2', actual: 14,   target: 20 },
          { q: 'Q3', actual: null, target: 20 },
          { q: 'Q4', actual: null, target: 20 },
        ],
      },
      {
        labelAr: 'الشراكات العلمية', target: 15, current: 5, unit: '',
        lastYearValue: 11,
        quarters: [
          { q: 'Q1', actual: 3,    target: 4 },
          { q: 'Q2', actual: 2,    target: 4 },
          { q: 'Q3', actual: null, target: 4 },
          { q: 'Q4', actual: null, target: 4 },
        ],
      },
      {
        labelAr: 'معدل الإنجاز', target: 88, current: 78, unit: '%',
        lastYearValue: 81,
        quarters: [
          { q: 'Q1', actual: 78,   target: 88 },
          { q: 'Q2', actual: 78,   target: 88 },
          { q: 'Q3', actual: null, target: 88 },
          { q: 'Q4', actual: null, target: 88 },
        ],
      },
    ],
```

- [ ] **Step 9: Verify TypeScript is clean**

```bash
cd "C:/Users/marwa/OneDrive/Documents/Projects/Cultural_Dashboard"
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors (or only pre-existing unrelated errors). Fix any errors before continuing.

- [ ] **Step 10: Commit**

```bash
git add types/department.ts data/departments/
git commit -m "feat: extend TargetProgress type with lastYearValue and quarters"
```

---

## Task 2: Update API route to populate new fields

**Files:**
- Modify: `app/api/departments/[pillar]/route.ts`

- [ ] **Step 1: Replace the `currentTargets` mapping block**

Find this block in the file (lines ~91–107):

```ts
    const currentTargets = kpis
      .map(k => {
        const target = k.targets[0]
        if (!target) return null
        // Use most recent available actual (prefer Q2>Q1, fall back to Q1)
        const orderedPeriods = ['Q4','Q3','Q2','Q1'] as const
        const latestActual = orderedPeriods
          .map(p => k.actuals.find(a => a.year === 2026 && a.period === p))
          .find(Boolean)
        return {
          labelAr: k.nameAr,
          target: Math.round(Number(target.value)),
          current: Math.round(Number(latestActual?.value ?? 0)),
          unit: unitDisplay(k.unit),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
```

Replace it with:

```ts
    const currentTargets = kpis
      .map(k => {
        const annualTarget = k.targets[0]
        if (!annualTarget) return null
        const isKpiPercent = k.unit === 'PERCENT'
        const annualTargetVal = Math.round(Number(annualTarget.value))

        // Last year annual actual
        const lyActual = k.actuals.find(a => a.year === 2025 && a.period === 'ANNUAL')
        const lastYearValue = lyActual ? Math.round(Number(lyActual.value)) : null

        // Per-quarter breakdown for 2026
        const quarters = QUARTERS.map(q => {
          const a = k.actuals.find(x => x.year === 2026 && x.period === q)
          const qTarget = isKpiPercent
            ? annualTargetVal
            : Math.round(annualTargetVal / 4)
          return {
            q,
            actual: a ? Math.round(Number(a.value)) : null,
            target: Math.max(qTarget, 1),
          }
        })

        // current: sum for COUNT/CURRENCY; average for PERCENT
        const nonNull = quarters.map(q => q.actual).filter((v): v is number => v !== null)
        const current = nonNull.length === 0
          ? 0
          : isKpiPercent
            ? Math.round(nonNull.reduce((s, v) => s + v, 0) / nonNull.length)
            : nonNull.reduce((s, v) => s + v, 0)

        return {
          labelAr: k.nameAr,
          target: annualTargetVal,
          current,
          unit: unitDisplay(k.unit),
          lastYearValue,
          quarters,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/departments/
git commit -m "feat: populate lastYearValue and quarters in department API route"
```

---

## Task 3: Replace ProgressCard with ActivityCard in CurrentYearTracker

**Files:**
- Modify: `components/department/CurrentYearTracker.tsx`

- [ ] **Step 1: Rewrite `CurrentYearTracker.tsx`**

Replace the entire file:

```tsx
'use client'

import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { DeptData, TargetProgress } from '@/types/department'

const QUARTER_COLOR: Record<string, string> = {
  Q1: '#6366f1',
  Q2: '#0891b2',
  Q3: '#d97706',
  Q4: '#16a34a',
}

function ActivityCard({ labelAr, target, current, unit, lowerIsBetter, lastYearValue, quarters }: TargetProgress) {
  const safePct = (num: number, den: number) =>
    den <= 0 ? 0 : Math.min((num / den) * 100, 100)

  const pct = lowerIsBetter
    ? safePct(target, Math.max(current, 1))
    : safePct(current, target)

  const barColor = pct >= 95 ? '#16a34a' : pct >= 80 ? '#d97706' : '#dc2626'

  const fmt = (v: number | null) => {
    if (v == null) return '—'
    if (unit === '%') return `${v}%`
    return v.toLocaleString('en')
  }

  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 16,
      border: '1px solid var(--border)', overflow: 'hidden',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header band */}
      <div style={{ background: 'var(--bg-alt)', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <p className="font-cairo text-[13px] font-semibold text-right leading-snug" style={{ color: 'var(--ink)' }}>
          {labelAr}
        </p>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Two-column stat row: last year vs current year */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-alt)' }}>
            <p className="font-space text-[9px] tracking-[.08em] uppercase mb-1" style={{ color: 'var(--ink-muted)' }}>
              2025
            </p>
            <p className="font-fraunces font-medium leading-none" style={{ fontSize: 20, color: 'var(--ink-soft)', letterSpacing: '-.02em' }}>
              {fmt(lastYearValue)}
            </p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{
            background: `${barColor}0f`,
            border: `1px solid ${barColor}30`,
          }}>
            <p className="font-space text-[9px] tracking-[.08em] uppercase mb-1" style={{ color: barColor }}>
              2026 حتى الآن
            </p>
            <p className="font-fraunces font-medium leading-none" style={{ fontSize: 20, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {fmt(current)}
            </p>
          </div>
        </div>

        {/* Quarterly horizontal bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {quarters.map(({ q, actual, target: qTarget }) => {
            const qPct = actual != null
              ? lowerIsBetter
                ? safePct(qTarget, Math.max(actual, 1))
                : safePct(actual, qTarget)
              : 0
            const c = QUARTER_COLOR[q]
            return (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="font-jb text-[10px] font-bold flex-shrink-0"
                  style={{ width: 20, textAlign: 'center', color: actual != null ? c : 'var(--ink-muted)' }}
                >
                  {q}
                </span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: 'var(--hair)' }}>
                  <div style={{
                    height: '100%',
                    width: `${qPct}%`,
                    background: actual != null ? c : 'transparent',
                    borderRadius: 999,
                  }} />
                </div>
                <span
                  className="font-jb text-[10px] flex-shrink-0"
                  style={{ width: 40, textAlign: 'left', color: actual != null ? 'var(--ink-soft)' : 'var(--ink-muted)' }}
                >
                  {fmt(actual)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer: cumulative progress vs annual target */}
        <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
              المستهدف: {fmt(target)}
            </span>
            <span className="font-jb text-[11px] font-bold" style={{ color: barColor }}>
              {Math.round(pct)}%
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--hair)' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 999,
              transition: 'width .4s ease',
            }} />
          </div>
          <p className="font-jb text-[9px] mt-1.5" style={{ color: 'var(--ink-muted)', textAlign: 'left' }}>
            {fmt(current)} من {fmt(target)} مستهدف
          </p>
        </div>
      </div>
    </div>
  )
}

interface Props {
  data: DeptData['currentYear']
  accentColor: string
}

export function CurrentYearTracker({ data, accentColor }: Props) {
  const chartData = data.monthlyProgress.map(m => ({
    month: m.month,
    actual: m.actual,
    target: m.target,
  }))

  return (
    <section className="space-y-5">
      <p className="font-space font-semibold text-[10px] tracking-[.14em] uppercase" style={{ color: 'var(--ink-muted)' }}>
        متابعة التقدم · {data.year}
      </p>

      {/* Activity cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.targets.map(t => (
          <ActivityCard key={t.labelAr} {...t} />
        ))}
      </div>

      {/* Monthly progress vs target chart */}
      <div className="rounded-2xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <p className="font-cairo text-[12px] font-semibold mb-3 text-right" style={{ color: 'var(--ink-soft)' }}>
          التقدم الشهري — الفعلي مقابل المستهدف
        </p>
        <div dir="ltr" style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => v != null ? [`${v}%`] : ['—']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="actual" name="الفعلي" fill={accentColor} opacity={0.85} radius={[3,3,0,0]} />
              <Line type="monotone" dataKey="target" name="المستهدف" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Check the UI in the browser**

The dev server should already be running at `http://localhost:3000`. Navigate to any department page (e.g. `/dashboard?pillar=EDUCATION`). Scroll to the "متابعة التقدم" section.

Verify:
- Each activity has a header band with the Arabic name
- Two-column stat box shows 2025 value (muted) on the right and 2026 cumulative (colored) on the left
- Four horizontal bars labelled Q1–Q4, with Q1 and Q2 filled and Q3/Q4 empty/grey
- Footer shows a progress bar and `X من Y مستهدف` label
- Colors match: green ≥ 95%, amber ≥ 80%, red < 80%

- [ ] **Step 4: Commit**

```bash
git add components/department/CurrentYearTracker.tsx
git commit -m "feat: replace ProgressCard with ActivityCard (Option B) in CurrentYearTracker"
```

---

## Task 4: Cleanup and final check

**Files:**
- Delete: `app/demo/card-mockup/page.tsx`

- [ ] **Step 1: Delete the mockup page**

```bash
rm "app/demo/card-mockup/page.tsx"
rmdir "app/demo/card-mockup" 2>/dev/null || true
```

- [ ] **Step 2: Final type check and lint**

```bash
npx tsc --noEmit 2>&1 | head -40
npm run lint 2>&1 | tail -20
```

Expected: no type errors, no lint errors introduced by this work.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove activity card brainstorm mockup page"
```
