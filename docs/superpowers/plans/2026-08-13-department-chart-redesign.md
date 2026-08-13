# Department Inner Chart Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal previous-year reference line with grouped muted bars, and wire activity cards to filter the chart to that card's quarterly data.

**Architecture:** Both changes live entirely inside `CurrentYearTracker.tsx`. A `selectedActivity` state (string | null) drives two `useMemo`-derived values — `chartData` and `prevYear` — that feed the Recharts `ComposedChart`. `ActivityCard` receives two new props (`isSelected`, `onSelect`) to handle visual selection state.

**Tech Stack:** Next.js (App Router), Recharts, TypeScript, Tailwind CSS

## Global Constraints

- RTL layout — use `borderInlineEnd` (not `borderRight`) for the "start side" accent border in Arabic context, since `dir="rtl"` means inline-end is on the left visually but `borderInlineStart` is the right edge
- Actually for RTL: the card's "start" border (the prominent accent edge) should use `borderInlineStart` which in RTL renders on the right side of the card
- No new files — all changes in `components/department/CurrentYearTracker.tsx`
- No new dependencies — `useState`, `useMemo` from React (already available); Recharts already imported
- Arabic label: previous year bar named `${year - 1} (تقديري)` in the Legend
- Reset pill text: `× الكل`
- TypeScript must pass: `npx tsc --noEmit` after each task

---

## File Map

| File | Change |
|------|--------|
| `components/department/CurrentYearTracker.tsx` | All changes — Tasks 1 and 2 |

---

### Task 1: Replace ReferenceLine with prevYear grouped bar

**Files:**
- Modify: `components/department/CurrentYearTracker.tsx`

**Interfaces:**
- Consumes: existing `TargetProgress` type with `quarters[]`, `lastYearValue`, `target`
- Produces: `buildTrendChart` returns `{ chartData: ChartPoint[] }` where `ChartPoint = { label: string; quarterly: number | null; target: number | null; prevYear: number }`

- [ ] **Step 1: Add `useMemo` and `useState` to the React import**

Open `components/department/CurrentYearTracker.tsx`. Change line 1 from:

```typescript
'use client'

import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
```

to:

```typescript
'use client'

import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
```

(`ReferenceLine` is removed from the import; `useMemo` and `useState` added.)

- [ ] **Step 2: Rewrite `buildTrendChart` to accept an optional selected label and return `prevYear` per quarter**

Replace the entire `buildTrendChart` function (lines 142–166) with:

```typescript
interface ChartPoint {
  label: string
  quarterly: number | null
  target: number | null
  prevYear: number
}

function buildTrendChart(
  targets: TargetProgress[],
  selectedLabelAr: string | null,
): ChartPoint[] {
  const active = selectedLabelAr
    ? targets.filter(t => t.labelAr === selectedLabelAr)
    : targets

  const prevYearAnnual = active.reduce((s, t) => s + (t.lastYearValue ?? 0), 0)
  const prevYearPerQuarter = prevYearAnnual / 4

  return (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
    const hasData = active.some(t => t.quarters.find(x => x.q === q)?.actual != null)
    const totalActual = active.reduce((s, t) => {
      const qd = t.quarters.find(x => x.q === q)
      return qd?.actual != null ? s + qd.actual : s
    }, 0)
    const totalTarget = active.reduce((s, t) => {
      const qd = t.quarters.find(x => x.q === q)
      return s + (qd?.target ?? 0)
    }, 0)
    return {
      label: q,
      quarterly: hasData ? totalActual : null,
      target: totalTarget || null,
      prevYear: prevYearPerQuarter,
    }
  })
}
```

- [ ] **Step 3: Update `CurrentYearTracker` to use the new signature**

Replace the body of `CurrentYearTracker` up to (but not including) the JSX return with:

```typescript
export function CurrentYearTracker({ data, accentColor }: Props) {
  const chartData = useMemo(
    () => buildTrendChart(data.targets, null),
    [data.targets],
  )
```

(We pass `null` for now — Task 2 will wire the state. The `prevYearTotal` variable is gone.)

- [ ] **Step 4: Replace `<ReferenceLine>` with a prevYear `<Bar>` and update YAxis**

Inside the JSX, replace the `ComposedChart` contents. The full updated chart block (replace from `<div dir="ltr"` to its closing `</div>`):

```tsx
<div dir="ltr" style={{ width: '100%', height: 220 }}>
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
      <YAxis
        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.18)]}
        tick={{ fontSize: 10, fill: '#94a3b8' }}
        tickFormatter={fmtAxis}
      />
      <Tooltip
        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
        formatter={(v: unknown, name) => [
          v != null ? Number(v).toLocaleString('en') : '—',
          name ?? '',
        ]}
      />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      {/* Previous year — muted reference bar (annual total ÷ 4, distributed equally) */}
      <Bar
        dataKey="prevYear"
        name={`${data.year - 1} (تقديري)`}
        fill={accentColor}
        fillOpacity={0.30}
        radius={[3, 3, 0, 0]}
        maxBarSize={24}
      />
      {/* Current year quarterly actuals */}
      <Bar
        dataKey="quarterly"
        name={`أرباع ${data.year}`}
        fill={accentColor}
        radius={[4, 4, 0, 0]}
        maxBarSize={36}
        fillOpacity={0.85}
      />
      {/* Quarterly target — dashed line */}
      <Line
        type="monotone"
        dataKey="target"
        name="المستهدف الفصلي"
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="5 3"
        dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
        connectNulls={false}
      />
    </ComposedChart>
  </ResponsiveContainer>
</div>
```

- [ ] **Step 5: Verify TypeScript passes**

Run:
```bash
cd "C:/Users/marwa/OneDrive/Documents/Projects/Cultural_Dashboard"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Open any department (e.g., click on Islamic Education). Expected:
- Each quarter now shows **two bars side by side** — a taller solid bar (2026 actuals) and a shorter muted bar (2025 ÷ 4)
- Legend shows three items: `2025 (تقديري)`, `أرباع 2026`, `المستهدف الفصلي`
- No horizontal dashed reference line

- [ ] **Step 7: Commit**

```bash
git add components/department/CurrentYearTracker.tsx
git commit -m "feat: replace prevYear reference line with grouped muted bar series"
```

---

### Task 2: Card selection state + chart title + ActivityCard visual states

**Files:**
- Modify: `components/department/CurrentYearTracker.tsx`

**Interfaces:**
- Consumes: `buildTrendChart(data.targets, selectedActivity)` from Task 1
- Consumes: `ActivityCard` component (inline in same file)
- Produces: clicking a card updates chart; clicking again or `× الكل` resets

- [ ] **Step 1: Add `selectedActivity` state to `CurrentYearTracker`**

At the top of the `CurrentYearTracker` function body, add:

```typescript
const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
```

Then update the `chartData` memo to pass `selectedActivity`:

```typescript
const chartData = useMemo(
  () => buildTrendChart(data.targets, selectedActivity),
  [data.targets, selectedActivity],
)
```

- [ ] **Step 2: Update the chart title area**

Replace the chart title `<p>` element:

```tsx
{/* Before (remove this): */}
<p className="font-cairo text-[12px] font-semibold mb-3 text-right" style={{ color: 'var(--ink-soft)' }}>
  مقارنة الأداء الفصلي ({data.year - 1}–{data.year})
</p>
```

With this title area that reacts to selection:

```tsx
<div className="flex items-center justify-between mb-3" style={{ flexDirection: 'row-reverse' }}>
  <p className="font-cairo text-[12px] font-semibold text-right" style={{ color: 'var(--ink-soft)' }}>
    {selectedActivity ?? `مقارنة الأداء الفصلي (${data.year - 1}–${data.year})`}
  </p>
  {selectedActivity && (
    <button
      onClick={() => setSelectedActivity(null)}
      className="font-jb text-[10px] px-2 py-0.5 rounded-full"
      style={{
        background: 'var(--bg-alt)',
        border: '1px solid var(--border)',
        color: 'var(--ink-muted)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      × الكل
    </button>
  )}
</div>
```

- [ ] **Step 3: Add `isSelected` and `onSelect` props to `ActivityCard`**

Update the `ActivityCard` function signature from:

```typescript
function ActivityCard({ labelAr, target, current, unit, lowerIsBetter, lastYearValue, quarters, year, accentColor }: TargetProgress & { year: number; accentColor: string }) {
```

to:

```typescript
function ActivityCard({
  labelAr, target, current, unit, lowerIsBetter, lastYearValue, quarters, year, accentColor,
  isSelected, onSelect,
}: TargetProgress & {
  year: number
  accentColor: string
  isSelected: boolean
  onSelect: () => void
}) {
```

- [ ] **Step 4: Apply visual selection states to the ActivityCard root element**

Update the card's root `<div>` style to react to `isSelected` and whether any card is selected. The card needs to know if *another* card is selected (to dim itself). We'll pass a separate `isDimmed` prop for clarity.

First update the props interface to add `isDimmed`:

```typescript
function ActivityCard({
  labelAr, target, current, unit, lowerIsBetter, lastYearValue, quarters, year, accentColor,
  isSelected, onSelect, isDimmed,
}: TargetProgress & {
  year: number
  accentColor: string
  isSelected: boolean
  onSelect: () => void
  isDimmed: boolean
}) {
```

Then update the root `<div>` style:

```tsx
<div
  onClick={onSelect}
  style={{
    background: isSelected ? `${accentColor}0d` : 'var(--card-bg)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    borderInlineStart: isSelected ? `4px solid ${accentColor}` : '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: 'var(--card-shadow)',
    opacity: isDimmed ? 0.55 : 1,
    transition: 'opacity .2s ease, background .15s ease, border-inline-start .15s ease',
    cursor: 'pointer',
  }}
>
```

- [ ] **Step 5: Wire `isSelected`, `onSelect`, and `isDimmed` in the cards grid**

Replace the activity cards mapping in `CurrentYearTracker`:

```tsx
{/* Before (remove): */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {data.targets.map(t => (
    <ActivityCard key={t.labelAr} {...t} year={data.year} accentColor={accentColor} />
  ))}
</div>
```

With:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {data.targets.map(t => (
    <ActivityCard
      key={t.labelAr}
      {...t}
      year={data.year}
      accentColor={accentColor}
      isSelected={selectedActivity === t.labelAr}
      isDimmed={selectedActivity !== null && selectedActivity !== t.labelAr}
      onSelect={() =>
        setSelectedActivity(prev => (prev === t.labelAr ? null : t.labelAr))
      }
    />
  ))}
</div>
```

(`onSelect` toggles: clicking the active card again resets to `null`.)

- [ ] **Step 6: Verify TypeScript passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Open any department. Expected behavior:

| Action | Expected result |
|--------|----------------|
| Default load | Chart shows aggregated quarters + two bar series; all cards at full opacity |
| Click a card | Chart bars update to that activity's Q1–Q4 data; chart title changes to card's Arabic name; clicked card gets accent border; other cards dim to ~55% opacity |
| Click same card again | Resets to aggregated view; all cards return to full opacity; title reverts |
| Click `× الكل` pill | Same as clicking active card again — resets |
| Click a different card | Chart updates to new card's data; selection moves |

- [ ] **Step 8: Commit**

```bash
git add components/department/CurrentYearTracker.tsx
git commit -m "feat: card-driven chart filtering with selected activity state"
```
