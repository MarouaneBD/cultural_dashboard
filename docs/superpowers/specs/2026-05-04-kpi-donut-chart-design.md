# KPI Card Donut Chart & English Numbers

**Date:** 2026-05-04  
**Status:** Approved

## Summary

Two changes to every KPI card:

1. Replace the colored dot indicator with a small SVG progress ring (donut) that shows `actual/target` progress as a filled arc, with the variance percentage in the center.
2. Switch all number formatting from Arabic-Indic numerals (`١٬٢٣٤`) to Latin/English numerals (`1,234`) app-wide.

The sparkline trend chart is kept as-is. The bottom footer changes from "97.0٪ / نسبة الإنجاز" to "المستهدف / [target value]". The target value is removed from beneath the actual number (it moves to the footer).

---

## Design

### Card layout (before → after)

```
BEFORE                                AFTER
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ ● (dot)  Arabic KPI name    │       │ ◎ (ring 97%)  Arabic KPI name│
│                             │       │                              │
│ [sparkline]     1,234       │       │ [sparkline]       1,234      │
│                 المستهدف:.. │       │                              │
│─────────────────────────────│       │──────────────────────────────│
│ 97.0٪           نسبة الإنجاز│       │ 1,272            المستهدف    │
└─────────────────────────────┘       └─────────────────────────────┘
```

### Progress ring spec

- **Size:** 40×40px SVG, inline in JSX (no extra component file needed — it's trivial)
- **Track circle:** `r=15`, `stroke-width=6`, color = faded variant of the status color (same as existing `bg-*-50` token)
- **Progress arc:** same `r=15`, `stroke-width=6`, status color (`emerald-500` / `amber-500` / `red-500`)
- **Arc length:** `stroke-dasharray = [circumference * pct/100, circumference]` where `circumference = 2π×15 ≈ 94.25`
- **Start at top:** `transform="rotate(-90 20 20)"` on the progress arc
- **Center label:** `<text>` at `(20, 24)`, `font-size=8.5`, `font-weight=700`, shows `formatVariancePct(pct)` value
- **Color tokens** (reuse existing `COLOR_DOT` / `COLOR_CLASSES` from `lib/kpi.ts`):

| Status | Arc stroke | Track stroke | Text fill |
|--------|-----------|--------------|-----------|
| green  | `#22c55e` | `#dcfce7`    | `#166534` |
| amber  | `#f59e0b` | `#fef3c7`    | `#92400e` |
| red    | `#ef4444` | `#fee2e2`    | `#991b1b` |

### Footer change

Replace the `<div>` containing `formatVariancePct(variance.pct)` + "نسبة الإنجاز" with:

```tsx
<span className="text-xs opacity-70">المستهدف</span>
<span className="text-sm font-semibold tabular-nums">
  {formatValue(variance.target, unit)}
</span>
```

Direction: label on the right (`text-right` side), value on the left (flex `justify-between`, RTL).

---

## Number formatting change

**File:** `lib/kpi.ts`

Both `formatValue` and `formatVariancePct` call `toLocaleString("ar", ...)`. Change locale to `"en"` in both. The Arabic percent sign `٪` is replaced with `%`.

**Before:**
```ts
return pct.toLocaleString('ar', { ... }) + '٪'
return value.toLocaleString('ar', { ... })
```

**After:**
```ts
return pct.toFixed(1) + '%'
return value.toLocaleString('en', { ... })
```

This propagates automatically to: KPI cards, drill-down modal, PDF export, audit log, narrative layer — every consumer of `formatValue` / `formatVariancePct`.

---

## Files changed

| File | Change |
|------|--------|
| `lib/kpi.ts` | Switch locale to `"en"`, `٪` → `%` |
| `components/kpi/KpiCard.tsx` | Replace dot span with inline SVG ring; update footer |
| `components/kpi/KpiCard.test.tsx` | Update snapshot/text assertions for new footer and `%` sign |
| `lib/kpi.test.ts` | Update format assertions: `١٬٢٣٤` → `1,234`, `٪` → `%` |

No new files. No new dependencies (SVG is inline, Recharts not needed for the ring).

---

## Out of scope

- Animating the ring fill on mount (not requested)
- Changing the sparkline to a donut (option A/B were not selected)
- Any changes to the drill-down modal layout
