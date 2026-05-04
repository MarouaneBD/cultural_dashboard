# KPI Donut Chart & English Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the KPI card's colored dot with a progress ring showing actual/target %, swap the footer from variance % to target value, and switch all number formatting to English (Latin) numerals app-wide.

**Architecture:** Two independent changes — (1) `lib/kpi.ts` formatting functions are the single source of truth for all number display, so changing locale there propagates everywhere; (2) `KpiCard.tsx` gets an inline SVG ring replacing the `<span>` dot and an updated footer row. No new files, no new dependencies.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Jest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `lib/kpi.ts` | `formatVariancePct`: `٪` → `%`. `formatValue`: locale `ar-AE` → `en`, `٪` → `%` |
| `lib/kpi.test.ts` | Update assertions: `٪` → `%`, Arabic-Indic numbers → Latin |
| `components/kpi/KpiCard.tsx` | Replace dot `<span>` with inline SVG ring; remove target from mid-section; update footer |
| `components/kpi/KpiCard.test.tsx` | Update regex assertions for `%` sign and target-in-footer layout |

---

## Task 1: Fix number formatting in `lib/kpi.ts`

**Files:**
- Modify: `lib/kpi.ts`

- [ ] **Step 1: Update the failing tests first**

Open `lib/kpi.test.ts`. Replace the three format-related assertions:

```ts
// lib/kpi.test.ts

describe('formatVariancePct', () => {
  it('formats with one decimal and Latin percent sign', () => {
    expect(formatVariancePct(90.123)).toBe('90.1%')
  })
})

describe('formatValue', () => {
  it('formats COUNT values as English locale numbers', () => {
    const result = formatValue(1000, 'COUNT')
    expect(result).toBe('1,000')
  })

  it('formats PERCENT values with Latin percent sign', () => {
    expect(formatValue(95, 'PERCENT')).toBe('95.0%')
  })

  it('formats CURRENCY values with dirham suffix', () => {
    expect(formatValue(5000, 'CURRENCY')).toContain('د.إ')
    expect(formatValue(5000, 'CURRENCY')).toContain('5,000')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest lib/kpi.test.ts --no-coverage
```

Expected failures:
- `formatVariancePct` — received `'90.1٪'`, expected `'90.1%'`
- `formatValue COUNT` — received Arabic-Indic string, expected `'1,000'`
- `formatValue PERCENT` — received `'95.0٪'`, expected `'95.0%'`
- `formatValue CURRENCY` — received Arabic-Indic digits

- [ ] **Step 3: Update `lib/kpi.ts`**

Replace the two format functions (lines 27–35):

```ts
export function formatVariancePct(pct: number): string {
  return `${pct.toFixed(1)}%`
}

export function formatValue(value: number, unit: 'PERCENT' | 'COUNT' | 'CURRENCY'): string {
  if (unit === 'PERCENT') return `${value.toFixed(1)}%`
  if (unit === 'CURRENCY') return value.toLocaleString('en') + ' د.إ'
  return value.toLocaleString('en')
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest lib/kpi.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/kpi.ts lib/kpi.test.ts
git commit -m "fix: switch number formatting to English (Latin) numerals"
```

---

## Task 2: Update `KpiCard.tsx` — ring + footer

**Files:**
- Modify: `components/kpi/KpiCard.tsx`

**Background:** The ring is an inline SVG. The arc length is calculated from the variance percentage:
- `circumference = 2 * Math.PI * 15 ≈ 94.25`
- `arcLength = Math.min(pct / 100, 1) * circumference` — capped at 100% so the ring never over-fills
- `stroke-dasharray="{arcLength} {circumference}"` with `stroke-dashoffset` = 0 (start-at-top handled by `rotate(-90)`)

Color tokens needed (hardcoded inline — these are stable, defined in the spec):

| `variance.color` | Arc `stroke` | Track `stroke` | Text `fill` |
|-----------------|-------------|----------------|-------------|
| `green`         | `#22c55e`   | `#dcfce7`      | `#166534`   |
| `amber`         | `#f59e0b`   | `#fef3c7`      | `#92400e`   |
| `red`           | `#ef4444`   | `#fee2e2`      | `#991b1b`   |

- [ ] **Step 1: Write the updated KpiCard test assertions**

Open `components/kpi/KpiCard.test.tsx`. Make these changes:

```ts
// Replace the 'renders actual and target values' test:
it('renders actual value', () => {
  render(<KpiCard kpi={baseKpi} />)
  expect(screen.getByText(/270/)).toBeInTheDocument()
})

// Replace the 'renders variance percentage' test:
it('renders variance percentage in the ring', () => {
  render(<KpiCard kpi={baseKpi} />)
  // formatVariancePct(90) = '90.0%' — now in SVG text inside the ring
  expect(screen.getByText(/90\.0%/)).toBeInTheDocument()
})

// Add a new test for target in footer:
it('renders target value in footer', () => {
  render(<KpiCard kpi={baseKpi} />)
  // formatValue(300, 'COUNT') = '300'
  expect(screen.getByText(/300/)).toBeInTheDocument()
  expect(screen.getByText('المستهدف')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests — verify the changed ones fail**

```bash
npx jest components/kpi/KpiCard.test.tsx --no-coverage
```

Expected failures:
- `renders variance percentage in the ring` — old card renders `90.0٪` not `90.0%`
- `renders target value in footer` — "المستهدف" not found in footer yet

- [ ] **Step 3: Rewrite `KpiCard.tsx`**

Replace the entire file content:

```tsx
'use client'

import { COLOR_CLASSES, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

const RING_COLORS = {
  green: { arc: '#22c55e', track: '#dcfce7', text: '#166534' },
  amber: { arc: '#f59e0b', track: '#fef3c7', text: '#92400e' },
  red:   { arc: '#ef4444', track: '#fee2e2', text: '#991b1b' },
} as const

const CIRCUMFERENCE = 2 * Math.PI * 15 // r=15 → ≈94.25

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const colorClass = COLOR_CLASSES[variance.color]
  const ring = RING_COLORS[variance.color]
  const arcLength = Math.min(variance.pct / 100, 1) * CIRCUMFERENCE

  return (
    <button
      onClick={onClick}
      className={`w-full text-right rounded-xl border p-5 transition-shadow hover:shadow-md cursor-pointer ${colorClass}`}
    >
      <div className="flex items-center justify-between mb-4">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={ring.track} strokeWidth="6" />
          <circle
            cx="20" cy="20" r="15"
            fill="none"
            stroke={ring.arc}
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
          />
          <text x="20" y="24" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={ring.text}>
            {formatVariancePct(variance.pct)}
          </text>
        </svg>
        <p className="text-sm font-semibold leading-snug flex-1 mr-2">{kpi.nameAr}</p>
      </div>

      <div className="flex items-end justify-between">
        <div className="w-24 h-12 flex-shrink-0">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
        <p className="text-3xl font-bold tabular-nums">
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-current/20 flex justify-between items-center">
        <span className="text-sm font-semibold tabular-nums">
          {formatValue(variance.target, unit)}
        </span>
        <span className="text-xs opacity-70">المستهدف</span>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Run tests — verify they all pass**

```bash
npx jest components/kpi/KpiCard.test.tsx --no-coverage
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS (including `lib/kpi.test.ts` from Task 1).

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/kpi/KpiCard.tsx components/kpi/KpiCard.test.tsx
git commit -m "feat: replace KPI dot with progress ring, show target in footer"
```

---

## Task 3: Smoke-test in the browser

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the dashboard**

Navigate to `http://localhost:3000`. Check:
- Each KPI card shows a small ring (not a dot) in the top-left corner
- The ring is filled proportionally and color-matches the card background
- The percentage is legible inside the ring
- The sparkline is still visible bottom-left
- The actual value is large on the right
- The footer shows "المستهدف / [number]" — not a variance percentage
- All numbers are Latin digits (`1,234` not `١٬٢٣٤`)

- [ ] **Step 3: Check drill-down modal and any other numeric surfaces**

Open any KPI card to trigger the drill-down modal. Confirm numbers in the modal are also Latin digits (they use `formatValue` from `lib/kpi.ts` — the fix propagates automatically).

- [ ] **Step 4: Stop the dev server**

`Ctrl+C`
