# Department Inner Chart Redesign

**Date:** 2026-08-13
**Scope:** `components/department/CurrentYearTracker.tsx` + `ActivityCard` sub-component
**Status:** Approved — ready for implementation

---

## Problem

The department drill-down chart has two weaknesses:

1. **Previous year shown as a horizontal reference line** — hard to compare quarter-by-quarter; visually ambiguous.
2. **Chart always shows aggregated totals** — no way to isolate a single activity's quarterly performance.

---

## Changes

### 1. Previous Year as Grouped Reference Bars

Replace the `<ReferenceLine>` with a second bar series rendered at 35% opacity (or cool gray) alongside each quarter's current-year bar.

| Series | Visual | Value |
|--------|--------|-------|
| 2026 (current) | Solid department accent color | `quarters[q].actual` |
| 2025 (previous) | Same hue at ~35% opacity, or `#94a3b8` | `lastYearValue ÷ 4` per quarter |

**Rationale for ÷ 4:** Only an annual 2025 total exists per activity. Distributing equally is the simplest honest approximation. The legend labels this series `2025 (تقديري)` — the word "تقديري" (estimated) and the muted fill signal to the reader that this is a reference distribution, not exact quarterly data.

**Forward compatibility:** When future years have real quarterly data (e.g., 2027 vs 2026), the `prevYearBar` derivation switches from `lastYearValue ÷ 4` to real per-quarter values. No UI change required.

The existing amber target line (`<Line>`) is retained.

---

### 2. Card-Driven Chart Filtering

#### State

```typescript
// Inside CurrentYearTracker
const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
```

`null` = "الكل" (all activities aggregated). A non-null value is the `labelAr` of the active activity.

#### Derived chart data (useMemo)

```typescript
const chartData = useMemo(() => {
  if (!selectedActivity) {
    // Aggregate all targets' quarters by Q label
    return aggregateAllQuarters(data.targets);
  }
  const target = data.targets.find(t => t.labelAr === selectedActivity)!;
  return target.quarters.map(q => ({
    name: q.q,
    actual: q.actual ?? 0,
    target: q.target,
  }));
}, [selectedActivity, data.targets]);

const prevYearBar = useMemo(() => {
  if (!selectedActivity) {
    const total = data.targets.reduce((s, t) => s + (t.lastYearValue ?? 0), 0);
    return total / 4;
  }
  const target = data.targets.find(t => t.labelAr === selectedActivity)!;
  return (target.lastYearValue ?? 0) / 4;
}, [selectedActivity, data.targets]);
```

`prevYearBar` is a single scalar — all four quarters share the same value (annual total ÷ 4).

#### Chart title area

- **Default state:** existing title (e.g., "مقارنة الأداء الفصلي")
- **Active state:** activity's `labelAr` + an inline `× الكل` reset pill

```
[عدد الحلقات]  [× الكل]
```

The reset pill is a small button styled as a muted chip. Clicking it sets `selectedActivity = null`.

#### Activity card states

`ActivityCard` receives two new props:

```typescript
isSelected: boolean   // true when this card is the active filter
onSelect: () => void  // sets selectedActivity to this card's labelAr (or null if already selected)
```

| State | Visual treatment |
|-------|-----------------|
| Default ("الكل") | All cards at full opacity, no border accent |
| This card selected | Left border in department accent color + subtle background tint |
| Other cards (not selected) | 60% opacity |

Clicking the already-selected card toggles back to "الكل" (sets `selectedActivity = null`).

---

## Files Changed

| File | Change |
|------|--------|
| `components/department/CurrentYearTracker.tsx` | Add `selectedActivity` state; derive `chartData` + `prevYearBar` via `useMemo`; replace `<ReferenceLine>` with second `<Bar>`; update chart title area; pass `isSelected`/`onSelect` to each `ActivityCard` |
| `ActivityCard` (inline or extracted sub-component) | Accept `isSelected` + `onSelect` props; apply visual selection states |

No new files. No API changes. No parent component changes.

---

## Out of Scope

- Real per-quarter 2025 data (requires data model change — deferred)
- Persisting the selected activity across navigation
- Animating the chart transition between states (Recharts handles this via its built-in animation)
