# KPI Sector Visibility + Donut Chart Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix cross-sector KPI bleed in the homepage charts, and give admins per-KPI control over what appears on each sector's homepage — via a toggle in the existing KPI edit modal.

**Architecture:** One new `showInDashboard Boolean @default(false)` field on `KpiRegistry`. The existing `PATCH /api/admin/kpis/[id]` route and `KpiEditModal` are extended. The `/api/stats/totals` route gains a required `division` query param and filters by both `showInDashboard = true` and the division's pillar set. `BeneficiaryChart` passes `division=CULTURE_RESEARCH`; `DivisionAchievementChart` already passes `division` and calls `/api/kpis` (unaffected). Nothing appears on sector homepages until admin explicitly opts a KPI in.

**Tech Stack:** Prisma migration, Next.js App Router, React Query, existing `withAuditUser`, `DEPARTMENTS` config from `lib/departments.ts`.

## Global Constraints

- Arabic-first: all user-visible strings are Arabic
- RBAC: only ADMIN can toggle `showInDashboard` (enforced in existing PATCH route — same `requireAdmin()` guard)
- Audit log required for every write to `KpiRegistry` — `withAuditUser` already wraps the PATCH route; no change needed
- `showInDashboard` defaults to `false` — nothing appears until admin opts in
- Pillar is immutable — `showInDashboard` does NOT change which sector a KPI belongs to; that is determined by `KpiRegistry.pillar`
- `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` on all API routes (already present)
- No new npm dependencies
- Do NOT change `KpiEditModal` props interface (`{ kpiId, onClose, onSaved }`) — only internal state changes

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | **Modify** — add `showInDashboard Boolean @default(false)` to `KpiRegistry` |
| `app/api/admin/kpis/[id]/route.ts` | **Modify** — accept + return `showInDashboard` in GET and PATCH |
| `app/api/admin/kpis/route.test.ts` | **Modify** — add test cases for `showInDashboard` |
| `components/admin/KpiEditModal.tsx` | **Modify** — add toggle field |
| `app/api/stats/totals/route.ts` | **Modify** — add `division` param, filter by `showInDashboard` + division pillars |
| `app/api/stats/totals/route.test.ts` | **Create** — tests for the fixed route |
| `components/kpi/BeneficiaryChart.tsx` | **Modify** — pass `division=CULTURE_RESEARCH` to query |

---

### Task 1: Prisma schema migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `KpiRegistry.showInDashboard` field, available to all subsequent tasks

- [ ] **Step 1: Add `showInDashboard` to `KpiRegistry` in `prisma/schema.prisma`**

Locate the `KpiRegistry` model (search for `model KpiRegistry`). Add the field after `activityType`:

```prisma
model KpiRegistry {
  id              String       @id @default(cuid())
  nameAr          String
  pillar          Pillar
  unit            KpiUnit      @default(COUNT)
  owner           String?
  slug            String?
  activityType    ActivityType @default(MONTHLY_VARIANCE)
  showInDashboard Boolean      @default(false)
  targets         Target[]
  actuals         Actual[]
  createdAt       DateTime     @default(now())

  @@unique([nameAr, pillar])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_show_in_dashboard
```

Expected output: `✔ Generated Prisma Client` and a new migration file under `prisma/migrations/`.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add showInDashboard boolean to KpiRegistry"
```

---

### Task 2: PATCH + GET route — accept and return `showInDashboard`

**Files:**
- Modify: `app/api/admin/kpis/[id]/route.ts`
- Modify: `app/api/admin/kpis/route.test.ts`

**Interfaces:**
- Consumes: `KpiRegistry.showInDashboard` from Task 1
- Produces:
  - `GET /api/admin/kpis/[id]` response now includes `showInDashboard: boolean`
  - `PATCH /api/admin/kpis/[id]` accepts `{ showInDashboard?: boolean }` in body

- [ ] **Step 1: Write failing tests**

Add these test cases to `app/api/admin/kpis/route.test.ts`.

First, update `mockKpi` to include the new field:
```ts
const mockKpi = {
  id: 'kpi-1',
  nameAr: 'برامج التعليم',
  pillar: 'EDUCATION',
  activityType: 'CUMULATIVE',
  unit: 'COUNT',
  owner: 'تعليم',
  showInDashboard: false,  // add this
}
```

Then add new test cases:

```ts
describe('GET: returns showInDashboard field', () => {
  it('includes showInDashboard false in response', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue({ ...mockKpi, showInDashboard: false })
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1')
    const res = await GET(req, makeParams('kpi-1'))
    const body = await res.json()
    expect(body.showInDashboard).toBe(false)
  })

  it('includes showInDashboard true in response', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue({ ...mockKpi, showInDashboard: true })
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1')
    const res = await GET(req, makeParams('kpi-1'))
    const body = await res.json()
    expect(body.showInDashboard).toBe(true)
  })
})

describe('PATCH: showInDashboard field', () => {
  it('updates showInDashboard to true', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue(mockKpi)
    mockPrisma.kpiRegistry.update.mockResolvedValue({ ...mockKpi, showInDashboard: true })
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
      method: 'PATCH',
      body: JSON.stringify({ showInDashboard: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('kpi-1'))
    expect(res.status).toBe(200)
    const updateCall = mockPrisma.kpiRegistry.update.mock.calls[0][0]
    expect(updateCall.data.showInDashboard).toBe(true)
  })

  it('returns 400 when only showInDashboard=undefined and nothing else', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue(mockKpi)
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('kpi-1'))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/api/admin/kpis/route.test.ts --no-coverage
```

Expected: new tests fail — `showInDashboard` not in GET response, PATCH doesn't write it.

- [ ] **Step 3: Update `app/api/admin/kpis/[id]/route.ts`**

**GET handler** — add `showInDashboard` to the response:

```ts
return NextResponse.json({
  id: kpi.id,
  nameAr: kpi.nameAr,
  pillar: kpi.pillar,
  activityType: kpi.activityType,
  unit: kpi.unit,
  owner: kpi.owner,
  showInDashboard: kpi.showInDashboard,  // add this line
})
```

**PATCH handler** — destructure and handle `showInDashboard`:

Change the body destructure line from:
```ts
const { nameAr, activityType, unit, owner } = body
```
To:
```ts
const { nameAr, activityType, unit, owner, showInDashboard } = body
```

Change the empty-body guard from:
```ts
if (nameAr === undefined && activityType === undefined && unit === undefined && owner === undefined) {
```
To:
```ts
if (nameAr === undefined && activityType === undefined && unit === undefined && owner === undefined && showInDashboard === undefined) {
```

Add `showInDashboard` to the patch assembly block (after `if (owner !== undefined) ...`):
```ts
if (showInDashboard !== undefined) patch.showInDashboard = Boolean(showInDashboard)
```

Also update the body type annotation to include the new field:
```ts
let body: { nameAr?: string; activityType?: string; unit?: string; owner?: string; pillar?: unknown; showInDashboard?: boolean }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/api/admin/kpis/route.test.ts --no-coverage
```

Expected: all tests pass (existing + new).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/kpis/\[id\]/route.ts app/api/admin/kpis/route.test.ts
git commit -m "feat(admin/kpis): GET and PATCH support showInDashboard field"
```

---

### Task 3: KpiEditModal — add `showInDashboard` toggle

**Files:**
- Modify: `components/admin/KpiEditModal.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/kpis/[id]` now returns `showInDashboard: boolean` (from Task 2)
- Consumes: `PATCH /api/admin/kpis/[id]` now accepts `showInDashboard?: boolean` (from Task 2)

- [ ] **Step 1: Update `KpiData` type and state in `KpiEditModal.tsx`**

Change the `KpiData` type:
```ts
type KpiData = {
  id: string
  nameAr: string
  activityType: string
  unit: string
  owner: string | null
  showInDashboard: boolean  // add this
}
```

Add state after `const [owner, setOwner] = useState('')`:
```ts
const [showInDashboard, setShowInDashboard] = useState(false)
```

In the `useEffect` fetch callback, add after `setOwner(d.owner ?? '')`:
```ts
setShowInDashboard(d.showInDashboard ?? false)
```

- [ ] **Step 2: Include `showInDashboard` in the diff for PATCH**

In `handleSave`, update the patch type:
```ts
const patch: Record<string, string | boolean | null> = {}
```

Add after the `owner` diff check:
```ts
if (data && showInDashboard !== data.showInDashboard) patch.showInDashboard = showInDashboard
```

- [ ] **Step 3: Add toggle field to the JSX**

Add this block after the owner field `</div>` and before `{submitError && ...}`:

```tsx
{/* Show in sector homepage */}
<div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
  <div>
    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>عرض في الصفحة الرئيسية للقطاع</p>
    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>عند التفعيل، يظهر هذا المؤشر في مخطط القطاع</p>
  </div>
  {/* dir="ltr" keeps standard LTR knob travel (left=off, right=on) regardless of page RTL */}
  <button
    type="button"
    dir="ltr"
    onClick={() => setShowInDashboard(v => !v)}
    className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors"
    style={{ background: showInDashboard ? 'var(--accent)' : 'var(--border)' }}
    role="switch"
    aria-checked={showInDashboard}
  >
    <span
      className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
      style={{ transform: showInDashboard ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
    />
  </button>
</div>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/admin/KpiEditModal.tsx
git commit -m "feat(admin): add showInDashboard toggle to KpiEditModal"
```

---

### Task 4: Fix `/api/stats/totals` + update BeneficiaryChart

**Files:**
- Modify: `app/api/stats/totals/route.ts`
- Create: `app/api/stats/totals/route.test.ts`
- Modify: `components/kpi/BeneficiaryChart.tsx`

**Interfaces:**
- Consumes: `KpiRegistry.showInDashboard` from Task 1
- Consumes: `DEPARTMENTS` from `lib/departments.ts` for pillar→division mapping
- `GET /api/stats/totals?year=&period=&division=` — `division` is now required; returns 400 if missing or unknown

- [ ] **Step 1: Write failing tests**

Create `app/api/stats/totals/route.test.ts`:

```ts
import { GET } from '@/app/api/stats/totals/route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({ auth: (...args: unknown[]) => mockAuth(...args) }))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn(),
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { kpiRegistry: { findMany: jest.Mock } }
}

function makeReq(params: Record<string, string>) {
  const url = new URL('http://localhost/api/stats/totals')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { role: 'ADMIN' } })
})

describe('GET /api/stats/totals', () => {
  it('returns 400 when division param is missing', async () => {
    const res = await GET(makeReq({ year: '2025', period: 'ANNUAL' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when division is unknown', async () => {
    const res = await GET(makeReq({ year: '2025', period: 'ANNUAL', division: 'UNKNOWN_DIV' }))
    expect(res.status).toBe(400)
  })

  it('filters KPIs by showInDashboard=true and division pillars', async () => {
    mockPrisma.kpiRegistry.findMany.mockResolvedValue([])
    await GET(makeReq({ year: '2025', period: 'ANNUAL', division: 'CULTURE_RESEARCH' }))
    const whereClause = mockPrisma.kpiRegistry.findMany.mock.calls[0][0].where
    expect(whereClause.showInDashboard).toBe(true)
    // CULTURE_RESEARCH pillars
    expect(whereClause.pillar.in).toEqual(expect.arrayContaining([
      'EDUCATION', 'FAMILY_CULTURE', 'ISLAMIC_INFO_CENTER',
      'AL_BIRR_MALE', 'AL_BIRR_FEMALE', 'ORPHANS',
      'SCIENTIFIC_PROGRAMS', 'RESEARCH_PUBLICATIONS',
    ]))
    expect(whereClause.pillar.in).toHaveLength(8)
  })

  it('filters INSTITUTIONAL_SUPPORT pillars correctly', async () => {
    mockPrisma.kpiRegistry.findMany.mockResolvedValue([])
    await GET(makeReq({ year: '2025', period: 'ANNUAL', division: 'INSTITUTIONAL_SUPPORT' }))
    const whereClause = mockPrisma.kpiRegistry.findMany.mock.calls[0][0].where
    expect(whereClause.pillar.in).toEqual(expect.arrayContaining([
      'HR_MANAGEMENT', 'ADMIN_AFFAIRS', 'PROCUREMENT',
    ]))
    expect(whereClause.pillar.in).toHaveLength(3)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeReq({ division: 'CULTURE_RESEARCH' }))
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/api/stats/totals/route.test.ts --no-coverage
```

Expected: `division param missing` test passes (accidentally), pillar filter tests fail — the route currently does not filter by `showInDashboard` or division.

- [ ] **Step 3: Update `app/api/stats/totals/route.ts`**

Add import at the top (after existing imports):
```ts
import { DEPARTMENTS } from '@/lib/departments'
import type { Pillar } from '@prisma/client'
```

Add division validation **before** the `try` block (after the `isQuarter` computation):

```ts
  // division is required — prevents cross-sector bleed
  const division = searchParams.get('division')
  const divisionPillars = division
    ? DEPARTMENTS.filter(d => d.division === division).map(d => d.id as Pillar)
    : []
  if (!division || divisionPillars.length === 0) {
    return NextResponse.json({ error: 'قطاع غير صالح' }, { status: 400 })
  }
```

Update the `prisma.kpiRegistry.findMany` call inside the `try` block:

```ts
    const kpis = await prisma.kpiRegistry.findMany({
      where: {
        unit: 'COUNT',
        showInDashboard: true,
        pillar: { in: divisionPillars },
      },
      take: 500,
      include: {
        actuals:  { where: { year } },
        targets:  { where: { year } },
      },
    })
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/api/stats/totals/route.test.ts --no-coverage
```

Expected: all 5 tests pass.

- [ ] **Step 5: Update `BeneficiaryChart.tsx` to pass division**

In `components/kpi/BeneficiaryChart.tsx`, find the `useQuery` block (~line 278):

Change:
```ts
  const { data, isLoading } = useQuery<TotalsResponse>({
    queryKey: ['stats-totals', year, period],
    queryFn: () =>
      fetch(`/api/stats/totals?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })
```

To:
```ts
  const { data, isLoading } = useQuery<TotalsResponse>({
    queryKey: ['stats-totals', year, period, 'CULTURE_RESEARCH'],
    queryFn: () =>
      fetch(`/api/stats/totals?year=${year}&period=${period}&division=CULTURE_RESEARCH`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })
```

`BeneficiaryChart` is only ever rendered for `divisionParam === 'CULTURE_RESEARCH'` (see `DashboardContent.tsx`), so hardcoding the division here is correct and avoids a prop-drilling chain.

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/api/stats/totals/route.ts app/api/stats/totals/route.test.ts components/kpi/BeneficiaryChart.tsx
git commit -m "fix(stats): filter totals by division+showInDashboard; fix cross-sector KPI bleed"
```
