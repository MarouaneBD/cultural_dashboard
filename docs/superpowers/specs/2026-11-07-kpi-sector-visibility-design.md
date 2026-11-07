# KPI Sector Visibility + Donut Chart Fix — Design Spec

**Goal:** Fix cross-sector KPI bleed in the homepage charts, and give admins explicit per-KPI control over what appears on each sector's homepage — via a toggle in the existing KPI edit modal.

**Architecture:** One new boolean field `showInDashboard` on `KpiRegistry` (default `false`). The existing `PATCH /api/admin/kpis/[id]` route and `KpiEditModal` are extended to handle it. The `/api/stats/totals` route gains a required `division` param and filters by both `showInDashboard = true` and the correct pillar set. Each sector homepage chart passes its own division, so KPIs never bleed across sectors.

**Tech Stack:** Prisma migration, existing `withAuditUser`, existing `KpiEditModal`, existing `/api/stats/totals` and `/api/kpis` routes, `DEPARTMENTS` config for pillar→division mapping.

## Global Constraints

- Arabic-first: all user-visible strings are Arabic
- RBAC: only ADMIN can toggle `showInDashboard` (enforced in existing PATCH route)
- Audit log required for every write to `KpiRegistry` — `withAuditUser` already wraps the PATCH route
- `showInDashboard` defaults to `false` — nothing appears on sector homepages until admin explicitly opts in
- Pillar is immutable — `showInDashboard` does not change which sector a KPI belongs to; that is still determined by `KpiRegistry.pillar`
- No new dependencies
- `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` on every API route (already present)

---

## Sub-project B1 — Schema: add `showInDashboard` to `KpiRegistry`

**File to modify:** `prisma/schema.prisma`

```prisma
model KpiRegistry {
  // ... existing fields ...
  showInDashboard Boolean  @default(false)
}
```

Run migration:
```bash
npx prisma migrate dev --name add_show_in_dashboard
```

---

## Sub-project B2 — PATCH route: accept `showInDashboard`

**File to modify:** `app/api/admin/kpis/[id]/route.ts`

In the body parser, add `showInDashboard` alongside the existing fields:

```ts
const { nameAr, activityType, unit, owner, showInDashboard } = await req.json()
```

In the patch assembly:
```ts
if (showInDashboard !== undefined) patch.showInDashboard = Boolean(showInDashboard)
```

Validation: no extra validation needed — it's a boolean. The existing "at least one field" check covers it. Pillar continues to be silently excluded.

The GET handler should also return `showInDashboard` so the modal can pre-fill the toggle:
```ts
return NextResponse.json({ id, nameAr, pillar, activityType, unit, owner, showInDashboard })
```

---

## Sub-project B3 — KpiEditModal: add toggle

**File to modify:** `components/admin/KpiEditModal.tsx`

Add a fifth field to the form:

| Field | Input | Validation |
|-------|-------|------------|
| عرض في الصفحة الرئيسية (`showInDashboard`) | toggle/checkbox | none — boolean |

- Pre-filled from GET response
- Included in the PATCH diff (only send if changed)
- Position: below the four existing fields, before the submit button
- Label: `عرض في الصفحة الرئيسية للقطاع`
- Helper text: `عند التفعيل، يظهر هذا المؤشر في مخطط القطاع`

---

## Sub-project B4 — `/api/stats/totals`: fix pillar filter

**File to modify:** `app/api/stats/totals/route.ts`

Current (broken):
```ts
const kpis = await prisma.kpiRegistry.findMany({
  where: { unit: 'COUNT' },
  take: 500,
  ...
})
```

Fixed:
```ts
const division = searchParams.get('division') // required
const divisionPillars = DEPARTMENTS
  .filter(d => d.division === division)
  .map(d => d.id as Pillar)

const kpis = await prisma.kpiRegistry.findMany({
  where: {
    unit: 'COUNT',
    showInDashboard: true,
    pillar: { in: divisionPillars },
  },
  take: 500,
  ...
})
```

If `division` is missing or unknown, return `{ totals: [] }` with a 400 response. This prevents the route from ever returning cross-sector data.

---

## Sub-project B5 — Sector homepage charts: pass `division`

**Files to modify:**
- `components/kpi/BeneficiaryChart.tsx` (used by CULTURE_RESEARCH)
- `components/kpi/DivisionAchievementChart.tsx` (used by ZAKAT_DEVELOPMENT and INSTITUTIONAL_SUPPORT)

Each chart currently calls `/api/stats/totals` without a `division` param. Update the fetch URL to include the division:

```ts
// BeneficiaryChart receives divisionId prop (or reads from parent)
fetch(`/api/stats/totals?year=${year}&period=${period}&division=${divisionId}`)
```

The parent `DashboardContent` already knows the active division — pass it down as a prop to whichever chart is rendered.

---

## Testing

- Upload a KPI for `HR_MANAGEMENT` (INSTITUTIONAL_SUPPORT) — confirm it does NOT appear on CULTURE_RESEARCH homepage chart
- Admin opens KPI edit modal for an HR_MANAGEMENT KPI → toggles "عرض في الصفحة الرئيسية" → saves → KPI now appears on INSTITUTIONAL_SUPPORT homepage chart only
- KPI with `showInDashboard = false` (default) → invisible on all sector homepages
- `/api/stats/totals` with no `division` param → 400
- `/api/stats/totals?division=CULTURE_RESEARCH` → returns only CULTURE_RESEARCH KPIs with `showInDashboard = true`
- ADMIN and VIEWER see the toggle in KpiEditModal; EDITOR cannot access KpiEditModal (pencil icon only shown to ADMIN)
