# Mobile Layout — Approval Page & Sidebar Drawer

**Date:** 2026-11-09
**Status:** Approved

---

## Goal

Make the data approval pages (`/admin/submissions` and `/admin/submissions/[id]`) fully usable on mobile phones, and fix the sidebar drawer animation glitch that causes it to snap in instead of sliding smoothly.

## Scope

Three files only:
- `components/admin/SubmissionsList.tsx`
- `components/admin/SubmissionDetail.tsx`
- `components/layout/Sidebar.tsx`

No API changes. No new dependencies. Desktop layout (`md:` and above) is unchanged.

---

## Problem 1 — Tables overflow on mobile

Both components render `<table>` elements with 6 columns. On a phone these extend beyond the viewport width, forcing horizontal scroll and making the approve/reject actions unreachable without scrolling.

---

## Problem 2 — Sidebar drawer snaps instead of sliding

On mobile the sidebar uses `hidden` / `flex` (display toggle) to show/hide. Because CSS transitions cannot animate between `display:none` and `display:flex`, the sidebar pops in instantly rather than sliding in from the right. The fix is to keep the element always rendered and use a CSS `transform` instead.

---

## Solution

### SubmissionsList — responsive cards

**Desktop (`md:` and above):** existing `<table>` unchanged.

**Mobile (below `md`):** a stacked list of cards, one per submission.

Each card layout:
```
┌─────────────────────────────────────┐
│  [اسم المرسل]            [badge]    │
│  filename.xlsx (muted, truncated)   │
│                                     │
│  12 يناير 2026      3 / 8 معلق     │
│                        [مراجعة →]  │
└─────────────────────────────────────┘
```

- Card: rounded-xl, border, `var(--card-bg)` background, `p-4`
- Status badge: same `STATUS_COLORS` mapping as the table
- Pending count: amber (`var(--gold)`) when `pendingCount > 0`, muted otherwise
- "مراجعة" link: full tap-target, accent color, aligned to the leading edge

Implementation: render two sibling elements in the same component — `<table className="hidden md:table ...">` and `<div className="md:hidden space-y-3">` — sharing the same data from the existing `useQuery`.

---

### SubmissionDetail — responsive cards

**Desktop (`md:` and above):** existing `<table>` unchanged.

**Mobile (below `md`):** a stacked list of cards, one per KPI row.

Each card layout:
```
┌─────────────────────────────────────┐
│  [KPI name — full width, semibold]  │
│                                     │
│  الفترة: الربع الأول 2026           │
│  الحالي: 1,000  →  الجديد: 1,120   │
│  الفرق: +120 (colored)              │
│                                     │
│  [قبول]              [رفض]         │  ← PENDING rows only
│  [status badge]                     │  ← non-PENDING rows
└─────────────────────────────────────┘
```

- Card: rounded-xl, border, `var(--card-bg)` background, `p-4`
- Data rows: two-column grid (`grid-cols-2`) for الحالي / الجديد
- Diff: same `<Diff>` component, inline after the values
- **Action area:** for `PENDING` rows — "قبول" button (full width, accent) + "رفض" toggle button below it. When rejecting, `<RejectForm>` expands below the buttons (same component, unchanged internals).
- **Non-pending:** status badge only, no buttons
- "قبول الكل" button: in the header section above the card list, same as desktop

Implementation: same two-sibling pattern — `<table className="hidden md:table ...">` and `<div className="md:hidden space-y-3">` — `RowActions` and `RejectForm` are reused unchanged.

---

### Sidebar — transform-based drawer

**Current (broken):**
```
!expanded ? 'hidden md:flex' : 'flex'
```
On mobile, this toggles `display:none` ↔ `display:flex`. The CSS `width` transition has nothing to animate from, so the sidebar appears instantly.

**Fix:**
```
'flex'  // always rendered
+ !expanded ? 'translate-x-full md:translate-x-0' : 'translate-x-0'
```

The sidebar is `position: fixed` on mobile (already the case), so it is always out of normal flow — the content `flex-1` continues to fill the full viewport width regardless. The `translate-x-full` slides the sidebar off-screen to the right (correct for RTL, where the sidebar is anchored to the right edge via `start-0`).

The `transition` inline style is extended to include `transform`:
```ts
transition: 'width .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1)'
```

Desktop behavior (`md:`): `md:translate-x-0` ensures the sidebar is always visible on desktop regardless of `expanded` state. Desktop width toggling (60px ↔ 210px) is unchanged.

The existing backdrop (`fixed inset-0 z-30 bg-black/50 md:hidden`) remains unchanged.

---

## What is NOT changed

- All API routes and data fetching logic
- `RejectForm` component internals
- `RowActions` approve/reject logic
- Desktop table layout (all columns, hover states, etc.)
- `AppShell`, `PeriodControls`, or any other layout component
- Any other page that uses `AppShell`

---

## Testing

- Verify sidebar slides in/out smoothly on a phone-sized viewport
- Verify backdrop closes sidebar on tap
- Verify cards render correctly for both list and detail pages at mobile widths
- Verify table layout is unchanged at `md:` and above
- Verify approve / reject actions work from the card layout
- Verify "قبول الكل" button is accessible on mobile
