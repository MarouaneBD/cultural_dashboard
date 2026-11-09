# Form-Based Data Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Excel file upload with a structured form-based data entry experience — a period-first grid for editors to submit actuals (direct to live for new values, queued for overwrites) and targets (always queued for admin approval).

**Architecture:** Two new API routes (`GET` and `POST /api/entry`) power a new editor page at `/dashboard/entry`. A new `POST /api/admin/kpis` route and admin page at `/admin/kpis` wires up the already-built `KpiGrid` + `KpiEditModal`. The existing `SubmissionRow` / approval queue is reused unchanged. Excel upload files are deleted last.

**Tech Stack:** Next.js App Router, Prisma ORM, React Query (`@tanstack/react-query`), next-auth, TypeScript, Tailwind CSS.

## Global Constraints

- Arabic-first RTL UI: all labels in Arabic, `dir="rtl"` on inputs
- All API routes check `session` via `auth()` from `@/auth`
- EDITOR scope guard: `session.user.assignedPillarId` must match the requested pillar (return 403 otherwise)
- VIEWER role cannot POST to `/api/entry` (return 403)
- `REPORTING_YEAR = 2026` from `@/lib/config`
- Pillar values come from `DEPARTMENTS` in `@/lib/departments` — `VALID_PILLAR_IDS` is `new Set(DEPARTMENTS.map(d => d.id))`
- `UploadSubmission` uses field `submitterId` (not `uploadedBy`)
- `SubmissionRow.tableType` is a plain string: `"ACTUAL"` or `"TARGET"`
- Do not add columns to the Prisma schema — use existing models only
- Run `npx tsc --noEmit` and `npm run lint` before each commit

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/entry/route.ts` | Create | GET (load KPIs + current values) + POST (submit rows) |
| `app/api/entry/route.test.ts` | Create | Tests for both handlers |
| `app/dashboard/entry/page.tsx` | Create | Editor data entry grid (two tabs: actuals + targets) |
| `lib/editor-access.ts` | Modify | Add `/dashboard/entry` exception so editors aren't redirected |
| `app/api/admin/kpis/route.ts` | Create | POST (create new KPI) — file does not exist yet |
| `app/admin/kpis/page.tsx` | Create | Admin KPI management with two-step sector→dept selector + KpiGrid |
| `components/layout/Sidebar.tsx` | Modify | Add "إدخال البيانات" and "إدارة المؤشرات" links; remove upload link |
| `app/upload/page.tsx` | Delete | Replaced by `/dashboard/entry` |
| `app/upload/submissions/page.tsx` | Delete | No longer needed |
| `app/api/upload/route.ts` | Delete | Replaced by `/api/entry` |
| `app/api/upload/submissions/route.ts` | Delete | No longer needed |
| `components/upload/FileUploader.tsx` | Delete | Replaced by data entry page |
| `components/upload/ValidationPreview.tsx` | Delete | Replaced by data entry page |
| `components/upload/SubmissionsStatus.tsx` | Delete | Replaced by existing admin submissions UI |
| `lib/excel.ts` | Delete | No longer needed |

---

## Task 1: `GET /api/entry` — load KPIs with current values

**Files:**
- Create: `app/api/entry/route.ts`
- Create: `app/api/entry/route.test.ts`

**Interfaces:**
- Produces: `GET /api/entry?pillar=EDUCATION&period=Q1&year=2026&tableType=ACTUAL`
  → `EntryKpiRow[]` where `EntryKpiRow = { kpiId: string; nameAr: string; unit: string; activityType: string; currentValue: number | null; hasPending: boolean }`

- [ ] **Step 1: Write the failing test**

Create `app/api/entry/route.test.ts`:

```ts
import { GET } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'EDUCATION' },
  }),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'k1', nameAr: 'عدد الطلاب', unit: 'COUNT', activityType: 'CUMULATIVE', pillar: 'EDUCATION' },
      ]),
    },
    actual: { findMany: jest.fn().mockResolvedValue([]) },
    target: { findMany: jest.fn().mockResolvedValue([]) },
    submissionRow: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))

test('GET /api/entry returns rows for assigned pillar', async () => {
  const req = new NextRequest('http://localhost/api/entry?pillar=EDUCATION&period=Q1&year=2026&tableType=ACTUAL')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toHaveLength(1)
  expect(body[0].kpiId).toBe('k1')
  expect(body[0].currentValue).toBeNull()
  expect(body[0].hasPending).toBe(false)
})

test('GET /api/entry returns 403 when EDITOR requests wrong pillar', async () => {
  const req = new NextRequest('http://localhost/api/entry?pillar=ORPHANS&period=Q1&year=2026&tableType=ACTUAL')
  const res = await GET(req)
  expect(res.status).toBe(403)
})

test('GET /api/entry returns 400 for missing pillar', async () => {
  const req = new NextRequest('http://localhost/api/entry?period=Q1&year=2026&tableType=ACTUAL')
  const res = await GET(req)
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest app/api/entry/route.test.ts --no-coverage
```

Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Implement GET handler**

Create `app/api/entry/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { REPORTING_YEAR } from '@/lib/config'
import { VALID_PILLAR_IDS } from '@/lib/departments'
import type { Pillar, Period } from '@prisma/client'

export type EntryKpiRow = {
  kpiId: string
  nameAr: string
  unit: string
  activityType: string
  currentValue: number | null
  hasPending: boolean
}

const VALID_PERIODS = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'])

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const pillar = searchParams.get('pillar') ?? ''
  const period = searchParams.get('period') ?? 'Q1'
  const year = parseInt(searchParams.get('year') ?? String(REPORTING_YEAR))
  const tableType = searchParams.get('tableType') ?? 'ACTUAL'

  if (!VALID_PILLAR_IDS.has(pillar)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }
  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'فترة غير صالحة' }, { status: 400 })
  }
  if (!['ACTUAL', 'TARGET'].includes(tableType)) {
    return NextResponse.json({ error: 'نوع غير صالح' }, { status: 400 })
  }
  if (isNaN(year)) {
    return NextResponse.json({ error: 'سنة غير صالحة' }, { status: 400 })
  }

  // EDITOR scope guard
  if (session.user.role === 'EDITOR' && session.user.assignedPillarId !== pillar) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const entryPeriod: Period = tableType === 'TARGET' ? 'ANNUAL' : (period as Period)

  const [kpis, actuals, targets, pendingRows] = await Promise.all([
    prisma.kpiRegistry.findMany({
      where: { pillar: pillar as Pillar },
      orderBy: { nameAr: 'asc' },
      select: { id: true, nameAr: true, unit: true, activityType: true },
    }),
    tableType === 'ACTUAL'
      ? prisma.actual.findMany({
          where: { kpi: { pillar: pillar as Pillar }, period: entryPeriod, year },
          select: { kpiId: true, value: true },
        })
      : Promise.resolve([]),
    tableType === 'TARGET'
      ? prisma.target.findMany({
          where: { kpi: { pillar: pillar as Pillar }, period: 'ANNUAL', year },
          select: { kpiId: true, value: true },
        })
      : Promise.resolve([]),
    prisma.submissionRow.findMany({
      where: {
        kpi: { pillar: pillar as Pillar },
        period: entryPeriod,
        year,
        tableType,
        status: 'PENDING',
      },
      select: { kpiId: true },
    }),
  ])

  const actualMap = new Map(actuals.map(a => [a.kpiId, Number(a.value)]))
  const targetMap = new Map(targets.map(t => [t.kpiId, Number(t.value)]))
  const pendingSet = new Set(pendingRows.map(r => r.kpiId))

  const result: EntryKpiRow[] = kpis.map(kpi => {
    const currentValue = tableType === 'TARGET'
      ? (targetMap.get(kpi.id) ?? null)
      : (actualMap.get(kpi.id) ?? null)
    return {
      kpiId: kpi.id,
      nameAr: kpi.nameAr,
      unit: kpi.unit,
      activityType: kpi.activityType,
      currentValue,
      hasPending: pendingSet.has(kpi.id),
    }
  })

  return NextResponse.json(result)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest app/api/entry/route.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/api/entry/route.ts app/api/entry/route.test.ts
git commit -m "feat(entry): add GET /api/entry — load KPIs with current values and pending status"
```

---

## Task 2: `POST /api/entry` — submit data rows

**Files:**
- Modify: `app/api/entry/route.ts` (add POST export)
- Modify: `app/api/entry/route.test.ts` (add POST tests)

**Interfaces:**
- Consumes: `EntryKpiRow` type from Task 1
- Produces: `POST /api/entry` with body `{ pillar, period, year, tableType, rows: { kpiId, value }[] }`
  → `{ direct: number; queued: number }`

Routing rules:
- `tableType === 'TARGET'` → always create `SubmissionRow` (PENDING)
- `tableType === 'ACTUAL'` + no existing `Actual` → upsert `Actual` directly
- `tableType === 'ACTUAL'` + existing `Actual` → create `SubmissionRow` (PENDING)

- [ ] **Step 1: Add POST tests**

Append to `app/api/entry/route.test.ts`:

```ts
import { POST } from './route'

const mockPrisma = {
  kpiRegistry: {
    findMany: jest.fn().mockResolvedValue([
      { id: 'k1', nameAr: 'عدد الطلاب' },
    ]),
  },
  actual: {
    findUnique: jest.fn().mockResolvedValue(null), // no existing actual
    upsert: jest.fn().mockResolvedValue({ id: 'a1' }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  target: { findMany: jest.fn().mockResolvedValue([]) },
  submissionRow: { create: jest.fn().mockResolvedValue({ id: 'sr1' }), findMany: jest.fn().mockResolvedValue([]) },
  uploadSubmission: { create: jest.fn().mockResolvedValue({ id: 'sub1' }) },
}

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

test('POST /api/entry writes new actual directly', async () => {
  mockPrisma.actual.findUnique.mockResolvedValue(null)
  const req = new NextRequest('http://localhost/api/entry', {
    method: 'POST',
    body: JSON.stringify({
      pillar: 'EDUCATION', period: 'Q1', year: 2026, tableType: 'ACTUAL',
      rows: [{ kpiId: 'k1', value: 100 }],
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.direct).toBe(1)
  expect(body.queued).toBe(0)
  expect(mockPrisma.actual.upsert).toHaveBeenCalled()
})

test('POST /api/entry queues overwrite actual', async () => {
  mockPrisma.actual.findUnique.mockResolvedValue({ id: 'existing', value: 50 })
  const req = new NextRequest('http://localhost/api/entry', {
    method: 'POST',
    body: JSON.stringify({
      pillar: 'EDUCATION', period: 'Q1', year: 2026, tableType: 'ACTUAL',
      rows: [{ kpiId: 'k1', value: 120 }],
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  const body = await res.json()
  expect(body.queued).toBe(1)
  expect(body.direct).toBe(0)
  expect(mockPrisma.submissionRow.create).toHaveBeenCalled()
})

test('POST /api/entry always queues targets', async () => {
  const req = new NextRequest('http://localhost/api/entry', {
    method: 'POST',
    body: JSON.stringify({
      pillar: 'EDUCATION', period: 'ANNUAL', year: 2026, tableType: 'TARGET',
      rows: [{ kpiId: 'k1', value: 500 }],
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  const body = await res.json()
  expect(body.queued).toBe(1)
  expect(body.direct).toBe(0)
})

test('POST /api/entry returns 403 for VIEWER', async () => {
  jest.mocked(require('@/auth').auth).mockResolvedValueOnce({
    user: { id: 'u2', role: 'VIEWER', assignedPillarId: null },
  })
  const req = new NextRequest('http://localhost/api/entry', {
    method: 'POST',
    body: JSON.stringify({ pillar: 'EDUCATION', period: 'Q1', year: 2026, tableType: 'ACTUAL', rows: [] }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(403)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/api/entry/route.test.ts --no-coverage
```

Expected: FAIL with "POST is not a function" (or similar)

- [ ] **Step 3: Implement POST handler**

Append to `app/api/entry/route.ts` (after the GET export):

```ts
import { DEPARTMENTS } from '@/lib/departments'

type PostBody = {
  pillar: string
  period: string
  year: number
  tableType: string
  rows: { kpiId: string; value: number }[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  let body: PostBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { pillar, period, year, tableType, rows } = body

  if (!VALID_PILLAR_IDS.has(pillar)) return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  if (!['ACTUAL', 'TARGET'].includes(tableType)) return NextResponse.json({ error: 'نوع غير صالح' }, { status: 400 })
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'لا توجد صفوف' }, { status: 400 })
  if (isNaN(year)) return NextResponse.json({ error: 'سنة غير صالحة' }, { status: 400 })

  // EDITOR scope guard
  if (session.user.role === 'EDITOR' && session.user.assignedPillarId !== pillar) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  // Validate values
  for (const row of rows) {
    if (typeof row.value !== 'number' || isNaN(row.value) || row.value < 0) {
      return NextResponse.json({ error: 'قيم غير صالحة' }, { status: 400 })
    }
  }

  // Verify all kpiIds belong to the requested pillar
  const kpiIds = rows.map(r => r.kpiId)
  const validKpis = await prisma.kpiRegistry.findMany({
    where: { id: { in: kpiIds }, pillar: pillar as Pillar },
    select: { id: true, nameAr: true },
  })
  if (validKpis.length !== kpiIds.length) {
    return NextResponse.json({ error: 'مؤشرات غير صالحة' }, { status: 400 })
  }
  const kpiNameMap = new Map(validKpis.map(k => [k.id, k.nameAr]))

  const entryPeriod: Period = tableType === 'TARGET' ? 'ANNUAL' : (period as Period)
  const dept = DEPARTMENTS.find(d => d.id === pillar)
  const deptLabel = dept?.labelAr ?? pillar

  let submissionId: string | null = null
  let direct = 0
  let queued = 0

  for (const row of rows) {
    const kpiNameAr = kpiNameMap.get(row.kpiId) ?? ''

    if (tableType === 'TARGET') {
      // Targets always go to the queue
      const existing = await prisma.target.findUnique({
        where: { kpiId_period_year: { kpiId: row.kpiId, period: 'ANNUAL', year } },
        select: { value: true },
      })
      if (!submissionId) {
        const sub = await prisma.uploadSubmission.create({
          data: {
            submitterId: session.user.id,
            filename: `إدخال مستهدفات ${deptLabel} - ${year}`,
            status: 'PENDING',
          },
        })
        submissionId = sub.id
      }
      await prisma.submissionRow.create({
        data: {
          submissionId: submissionId!,
          kpiId: row.kpiId,
          kpiNameAr,
          period: 'ANNUAL',
          year,
          newValue: row.value,
          oldValue: existing ? Number(existing.value) : 0,
          tableType: 'TARGET',
          status: 'PENDING',
        },
      })
      queued++
    } else {
      // Actuals: direct if new, queued if overwrite
      const existing = await prisma.actual.findUnique({
        where: { kpiId_period_year: { kpiId: row.kpiId, period: entryPeriod, year } },
        select: { value: true },
      })

      if (existing) {
        // Overwrite → queue
        if (!submissionId) {
          const sub = await prisma.uploadSubmission.create({
            data: {
              submitterId: session.user.id,
              filename: `إدخال بيانات ${deptLabel} - ${entryPeriod} ${year}`,
              status: 'PENDING',
            },
          })
          submissionId = sub.id
        }
        await prisma.submissionRow.create({
          data: {
            submissionId: submissionId!,
            kpiId: row.kpiId,
            kpiNameAr,
            period: entryPeriod,
            year,
            newValue: row.value,
            oldValue: Number(existing.value),
            tableType: 'ACTUAL',
            status: 'PENDING',
          },
        })
        queued++
      } else {
        // New → direct
        await prisma.actual.upsert({
          where: { kpiId_period_year: { kpiId: row.kpiId, period: entryPeriod, year } },
          update: { value: row.value },
          create: { kpiId: row.kpiId, period: entryPeriod, year, value: row.value },
        })
        direct++
      }
    }
  }

  return NextResponse.json({ direct, queued })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/api/entry/route.test.ts --no-coverage
```

Expected: PASS (7 tests total — 3 from Task 1 + 4 new)

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/api/entry/route.ts app/api/entry/route.test.ts
git commit -m "feat(entry): add POST /api/entry — direct actuals, queued targets and overwrites"
```

---

## Task 3: Data entry page at `/dashboard/entry`

**Files:**
- Create: `app/dashboard/entry/page.tsx`
- Modify: `lib/editor-access.ts` (add `/dashboard/entry` exception)

**Interfaces:**
- Consumes: `GET /api/entry` → `EntryKpiRow[]` (from Task 1)
- Consumes: `POST /api/entry` → `{ direct, queued }` (from Task 2)

- [ ] **Step 1: Fix `lib/editor-access.ts` to allow `/dashboard/entry`**

Read `lib/editor-access.ts`. The current last section (before `return null`) is:

```ts
  // Bare /dashboard with no params → send to their sector
  if (!divisionParam && !pillarParam) return sectorHome
```

Add an exception for the entry page immediately after `if (!pathname.startsWith('/dashboard')) return null`:

```ts
  // Data entry page: allow EDITOR to access their own entry page without params
  if (pathname === '/dashboard/entry') return null
```

The full updated `lib/editor-access.ts`:

```ts
import { DEPARTMENTS } from '@/lib/departments'

export function getEditorRedirect(
  pathname: string,
  searchParams: URLSearchParams,
  assignedPillarId: string | null | undefined,
): string | null {
  if (pathname === '/no-access') return null
  if (!pathname.startsWith('/dashboard')) return null

  // Data entry page: editors can access it without division/pillar params
  if (pathname === '/dashboard/entry') return null

  if (!assignedPillarId) return '/no-access'

  const dept = DEPARTMENTS.find(d => d.id === assignedPillarId)
  if (!dept) return '/no-access'

  const assignedDivision = dept.division
  const sectorHome = `/dashboard?division=${assignedDivision}`

  const pillarParam = searchParams.get('pillar')
  const divisionParam = searchParams.get('division')

  if (pillarParam && pillarParam !== assignedPillarId) return sectorHome
  if (divisionParam && divisionParam !== assignedDivision) return sectorHome
  if (!divisionParam && !pillarParam) return sectorHome

  return null
}
```

- [ ] **Step 2: Verify editor-access tests still pass**

```bash
npx jest lib/editor-access --no-coverage
```

Expected: all tests PASS. If a test existed for the bare `/dashboard` case, it should still pass. If none exist, skip.

- [ ] **Step 3: Create the data entry page**

Create `app/dashboard/entry/page.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { REPORTING_YEAR } from '@/lib/config'
import { DEPARTMENTS } from '@/lib/departments'
import type { EntryKpiRow } from '@/app/api/entry/route'

type TabType = 'ACTUAL' | 'TARGET'
type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4'

const PERIODS: Period[] = ['Q1', 'Q2', 'Q3', 'Q4']
const UNIT_LABEL: Record<string, string> = { COUNT: 'عدد', PERCENT: '%', CURRENCY: 'درهم' }

export default function DataEntryPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()

  const [tab, setTab] = useState<TabType>('ACTUAL')
  const [period, setPeriod] = useState<Period>('Q1')
  const [values, setValues] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'
  const [adminPillar, setAdminPillar] = useState<string>(DEPARTMENTS[0].id)
  const pillar = isAdmin ? adminPillar : (session?.user?.assignedPillarId ?? '')

  const entryPeriod = tab === 'TARGET' ? 'ANNUAL' : period

  const { data: rows = [], isLoading } = useQuery<EntryKpiRow[]>({
    queryKey: ['entry', pillar, entryPeriod, tab],
    queryFn: () =>
      fetch(`/api/entry?pillar=${pillar}&period=${entryPeriod}&year=${REPORTING_YEAR}&tableType=${tab}`)
        .then(r => { if (!r.ok) throw new Error('فشل التحميل'); return r.json() }),
    enabled: !!pillar,
  })

  // Reset input values when tab, period, or pillar changes
  useEffect(() => { setValues({}) }, [tab, period, pillar])

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const submit = useMutation({
    mutationFn: async () => {
      const submitRows = Object.entries(values)
        .filter(([, v]) => v.trim() !== '')
        .map(([kpiId, v]) => ({ kpiId, value: parseFloat(v) }))
        .filter(r => !isNaN(r.value))

      if (submitRows.length === 0) throw new Error('لا توجد قيم للحفظ')

      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar,
          period: entryPeriod,
          year: REPORTING_YEAR,
          tableType: tab,
          rows: submitRows,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `خطأ ${res.status}`)
      }
      return res.json() as Promise<{ direct: number; queued: number }>
    },
    onSuccess: ({ direct, queued }) => {
      setValues({})
      qc.invalidateQueries({ queryKey: ['entry', pillar] })
      const parts: string[] = []
      if (direct > 0) parts.push(`تم حفظ ${direct} قيمة مباشرة`)
      if (queued > 0) parts.push(`تم إرسال ${queued} للمراجعة`)
      showToast(parts.join(' · '), 'success')
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  // Compute footer summary
  const dirtyEntries = Object.entries(values).filter(([, v]) => v.trim() !== '')
  const overwrites = dirtyEntries.filter(([kpiId]) => rows.find(r => r.kpiId === kpiId)?.currentValue != null).length
  const newEntries = dirtyEntries.length - overwrites
  const needsApproval = tab === 'TARGET' ? dirtyEntries.length : overwrites

  const deptLabel = DEPARTMENTS.find(d => d.id === pillar)?.labelAr ?? ''

  return (
    <AppShell title="إدخال البيانات">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Admin pillar selector */}
        {isAdmin && (
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>القسم:</label>
            <select
              value={adminPillar}
              onChange={e => setAdminPillar(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.labelAr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Department name */}
        {!isAdmin && (
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{deptLabel}</p>
        )}

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {(['ACTUAL', 'TARGET'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--ink-muted)',
              }}
            >
              {t === 'ACTUAL' ? 'المتحققات' : 'المستهدفات'}
            </button>
          ))}
        </div>

        {/* Period selector — actuals only */}
        {tab === 'ACTUAL' && (
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: period === p ? 'var(--accent)' : 'var(--bg-alt)',
                  color: period === p ? '#fff' : 'var(--ink)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Targets info banner */}
        {tab === 'TARGET' && (
          <div className="rounded-lg px-4 py-2 text-sm" style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
            المستهدفات تخضع لمراجعة الإدارة قبل الحفظ
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--bg-alt)' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>لا توجد مؤشرات لهذا القسم</p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--ink-muted)' }}>المؤشر</th>
                  <th className="text-center px-3 py-2 font-medium w-16" style={{ color: 'var(--ink-muted)' }}>الوحدة</th>
                  <th className="text-center px-3 py-2 font-medium w-32" style={{ color: 'var(--ink-muted)' }}>
                    {tab === 'TARGET' ? 'المستهدف الحالي' : 'القيمة السابقة'}
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-36" style={{ color: 'var(--ink-muted)' }}>
                    {tab === 'TARGET' ? 'المستهدف الجديد' : 'القيمة الجديدة'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isOverwrite = row.currentValue != null
                  const hasInput = (values[row.kpiId] ?? '').trim() !== ''
                  return (
                    <tr
                      key={row.kpiId}
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--border)' : undefined,
                        background: isOverwrite && hasInput ? '#fffbeb' : undefined,
                        borderRight: isOverwrite && hasInput ? '3px solid #f59e0b' : undefined,
                      }}
                    >
                      <td className="px-4 py-2" style={{ color: 'var(--ink)' }}>
                        {row.nameAr}
                        {row.hasPending && (
                          <span className="mr-2 text-xs px-1.5 py-0.5 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                            بانتظار الموافقة
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--ink-muted)' }}>
                        {UNIT_LABEL[row.unit] ?? row.unit}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--ink-muted)' }}>
                        {row.currentValue != null ? row.currentValue.toLocaleString('ar-SA') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          dir="ltr"
                          value={values[row.kpiId] ?? ''}
                          onChange={e => setValues(v => ({ ...v, [row.kpiId]: e.target.value }))}
                          className="w-full rounded-lg border px-2 py-1 text-center text-sm"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sticky footer */}
        {dirtyEntries.length > 0 && (
          <div
            className="sticky bottom-4 flex items-center justify-between rounded-xl px-4 py-3 shadow-lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              {newEntries > 0 && `${newEntries} قيمة جديدة`}
              {newEntries > 0 && needsApproval > 0 && ' · '}
              {needsApproval > 0 && `${needsApproval} يحتاج موافقة`}
            </p>
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {submit.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm shadow-xl z-50"
            style={{
              background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: toast.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
            }}
          >
            {toast.msg}
          </div>
        )}

      </div>
    </AppShell>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `EntryKpiRow` import from route causes issues, move the type to `types/entry.ts` and import from there in both the route and the page.

- [ ] **Step 5: Run dev server and verify manually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard/entry` as an EDITOR user.

Verify:
- Two tabs render: المتحققات and المستهدفات
- Period selector shows Q1–Q4 on Actuals tab
- Grid loads KPIs for the editor's assigned department
- Typing a value in an input enables the footer
- KPIs with existing values show amber left border when input is filled
- Submitting new values shows success toast
- After submit, inputs reset

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/entry/page.tsx lib/editor-access.ts
git commit -m "feat(entry): add data entry grid page at /dashboard/entry"
```

---

## Task 4: `POST /api/admin/kpis` — create KPI

**Files:**
- Create: `app/api/admin/kpis/route.ts` (this file does not exist — the existing route is at `app/api/admin/kpis/[id]/route.ts`)

**Interfaces:**
- Produces: `POST /api/admin/kpis` with `{ nameAr, pillar, unit, activityType, showInDashboard? }` → 201 KpiRegistry record

- [ ] **Step 1: Read `app/api/admin/kpis/[id]/route.ts`**

Read the file to identify the `requireAdmin` import path and `withAuditUser` import path. They will look like:

```ts
import { requireAdmin } from '@/lib/auth-helpers'   // or similar
import { withAuditUser } from '@/lib/prisma'          // or similar
```

Use the exact same import paths in the new route.

- [ ] **Step 2: Write the failing test**

Create `app/api/admin/kpis/route.test.ts`:

```ts
import { POST } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } }),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      create: jest.fn().mockResolvedValue({
        id: 'k1', nameAr: 'عدد البرامج', pillar: 'EDUCATION',
        unit: 'COUNT', activityType: 'CUMULATIVE', showInDashboard: false,
      }),
    },
  },
  withAuditUser: jest.fn((userId, fn) => fn()),
}))

test('POST /api/admin/kpis creates a KPI and returns 201', async () => {
  const req = new NextRequest('http://localhost/api/admin/kpis', {
    method: 'POST',
    body: JSON.stringify({ nameAr: 'عدد البرامج', pillar: 'EDUCATION', unit: 'COUNT', activityType: 'CUMULATIVE' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.nameAr).toBe('عدد البرامج')
})

test('POST /api/admin/kpis returns 400 for missing nameAr', async () => {
  const req = new NextRequest('http://localhost/api/admin/kpis', {
    method: 'POST',
    body: JSON.stringify({ pillar: 'EDUCATION', unit: 'COUNT', activityType: 'CUMULATIVE' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})

test('POST /api/admin/kpis returns 400 for invalid unit', async () => {
  const req = new NextRequest('http://localhost/api/admin/kpis', {
    method: 'POST',
    body: JSON.stringify({ nameAr: 'عدد البرامج', pillar: 'EDUCATION', unit: 'INVALID', activityType: 'CUMULATIVE' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest app/api/admin/kpis/route.test.ts --no-coverage
```

Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 4: Implement the route**

Create `app/api/admin/kpis/route.ts` (using import paths from Step 1):

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'   // adjust import based on Step 1
import { VALID_PILLAR_IDS } from '@/lib/departments'
import { Prisma } from '@prisma/client'
import type { Pillar, KpiUnit, ActivityType } from '@prisma/client'

const VALID_UNITS = new Set<string>(['PERCENT', 'COUNT', 'CURRENCY'])
const VALID_ACTIVITY_TYPES = new Set<string>(['CUMULATIVE', 'MONTHLY_VARIANCE'])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  let body: { nameAr?: string; pillar?: string; unit?: string; activityType?: string; showInDashboard?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { nameAr, pillar, unit, activityType, showInDashboard } = body

  if (!nameAr || nameAr.trim().length < 3) {
    return NextResponse.json({ error: 'الاسم قصير جداً (3 أحرف على الأقل)' }, { status: 400 })
  }
  if (!pillar || !VALID_PILLAR_IDS.has(pillar)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }
  if (!unit || !VALID_UNITS.has(unit)) {
    return NextResponse.json({ error: 'وحدة غير صالحة' }, { status: 400 })
  }
  if (!activityType || !VALID_ACTIVITY_TYPES.has(activityType)) {
    return NextResponse.json({ error: 'نوع نشاط غير صالح' }, { status: 400 })
  }

  try {
    const kpi = await withAuditUser(session.user.id, () =>
      prisma.kpiRegistry.create({
        data: {
          nameAr: nameAr.trim(),
          pillar: pillar as Pillar,
          unit: unit as KpiUnit,
          activityType: activityType as ActivityType,
          showInDashboard: Boolean(showInDashboard),
        },
      })
    )
    return NextResponse.json(kpi, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الاسم مستخدم لمؤشر آخر في نفس القسم' }, { status: 409 })
    }
    console.error('[admin/kpis] create failed', err)
    return NextResponse.json({ error: 'فشل الإنشاء' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest app/api/admin/kpis/route.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/kpis/route.ts app/api/admin/kpis/route.test.ts
git commit -m "feat(admin): add POST /api/admin/kpis — create KPI in registry"
```

---

## Task 5: Admin KPI management page at `/admin/kpis`

**Files:**
- Create: `app/admin/kpis/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/kpis` (Task 4)
- Consumes: `KpiGrid` from `@/components/kpi/KpiGrid` (existing)
- Consumes: `DIVISIONS` from `@/lib/divisions` — `[{ id, labelAr }, ...]`
- Consumes: `DEPARTMENTS` from `@/lib/departments` — `[{ id, labelAr, division }, ...]`

- [ ] **Step 1: Create the admin KPI management page**

Create `app/admin/kpis/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { DIVISIONS } from '@/lib/divisions'
import { DEPARTMENTS } from '@/lib/departments'
import type { DivisionId } from '@/lib/divisions'
import type { PillarId } from '@/types'

type FormState = {
  nameAr: string
  unit: string
  activityType: string
  showInDashboard: boolean
}

const INITIAL_FORM: FormState = { nameAr: '', unit: 'COUNT', activityType: 'CUMULATIVE', showInDashboard: false }

export default function AdminKpisPage() {
  const qc = useQueryClient()

  // Two-step selector for grid view
  const [viewDivision, setViewDivision] = useState<DivisionId>(DIVISIONS[0].id)
  const viewDepts = DEPARTMENTS.filter(d => d.division === viewDivision)
  const [viewPillar, setViewPillar] = useState<PillarId>(viewDepts[0].id as PillarId)

  // Two-step selector for KPI creation form
  const [createDivision, setCreateDivision] = useState<DivisionId>(DIVISIONS[0].id)
  const createDepts = DEPARTMENTS.filter(d => d.division === createDivision)
  const [createPillar, setCreatePillar] = useState<string>(createDepts[0].id)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [nameError, setNameError] = useState('')

  function handleDivisionChange(divId: DivisionId) {
    setCreateDivision(divId)
    const depts = DEPARTMENTS.filter(d => d.division === divId)
    setCreatePillar(depts[0].id)
  }

  function handleViewDivisionChange(divId: DivisionId) {
    setViewDivision(divId)
    const depts = DEPARTMENTS.filter(d => d.division === divId)
    setViewPillar(depts[0].id as PillarId)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setNameError('')

    if (form.nameAr.trim().length < 3) {
      setNameError('الاسم قصير جداً (3 أحرف على الأقل)')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: form.nameAr.trim(),
          pillar: createPillar,
          unit: form.unit,
          activityType: form.activityType,
          showInDashboard: form.showInDashboard,
        }),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (res.status === 409) { setNameError('هذا الاسم مستخدم لمؤشر آخر في نفس القسم'); return }
      if (!res.ok) { setFormError(body.error ?? `خطأ ${res.status}`); return }

      setForm(INITIAL_FORM)
      qc.invalidateQueries({ queryKey: ['kpis'] })
      // Switch grid view to the newly-created KPI's pillar
      setViewDivision(createDivision)
      setViewPillar(createPillar as PillarId)
    } catch {
      setFormError('تعذّر الاتصال بالخادم')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="إدارة المؤشرات">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Create KPI form ── */}
        <section className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>إضافة مؤشر جديد</h2>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Step 1: Sector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>القطاع</label>
                <select
                  value={createDivision}
                  onChange={e => handleDivisionChange(e.target.value as DivisionId)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  {DIVISIONS.map(div => (
                    <option key={div.id} value={div.id}>{div.labelAr}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Department (filtered by selected sector) */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>القسم</label>
                <select
                  value={createPillar}
                  onChange={e => setCreatePillar(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  {createDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.labelAr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPI name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>اسم المؤشر بالعربية</label>
              <input
                type="text"
                dir="rtl"
                value={form.nameAr}
                onChange={e => { setForm(f => ({ ...f, nameAr: e.target.value })); setNameError('') }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: nameError ? '#dc2626' : 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                placeholder="مثال: عدد البرامج المنفذة"
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>

            {/* Unit + Activity type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>الوحدة</label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  <option value="COUNT">عدد</option>
                  <option value="PERCENT">نسبة مئوية</option>
                  <option value="CURRENCY">عملة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>نوع النشاط</label>
                <select
                  value={form.activityType}
                  onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  <option value="CUMULATIVE">تراكمي</option>
                  <option value="MONTHLY_VARIANCE">شهري</option>
                </select>
              </div>
            </div>

            {/* Show in dashboard toggle */}
            <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>عرض في الصفحة الرئيسية للقطاع</p>
              </div>
              <button
                type="button"
                dir="ltr"
                onClick={() => setForm(f => ({ ...f, showInDashboard: !f.showInDashboard }))}
                className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                style={{ background: form.showInDashboard ? 'var(--accent)' : 'var(--border)' }}
                role="switch"
                aria-checked={form.showInDashboard}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
                  style={{ transform: form.showInDashboard ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
                />
              </button>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? 'جاري الإضافة...' : 'إضافة مؤشر'}
              </button>
            </div>
          </form>
        </section>

        {/* ── KPI grid view ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>مؤشرات القسم</h2>

          {/* Two-step sector→dept selector for grid */}
          <div className="flex gap-3 items-center">
            <select
              value={viewDivision}
              onChange={e => handleViewDivisionChange(e.target.value as DivisionId)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              {DIVISIONS.map(div => (
                <option key={div.id} value={div.id}>{div.labelAr}</option>
              ))}
            </select>
            <select
              value={viewPillar}
              onChange={e => setViewPillar(e.target.value as PillarId)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              {viewDepts.map(d => (
                <option key={d.id} value={d.id}>{d.labelAr}</option>
              ))}
            </select>
          </div>

          <KpiGrid pillar={viewPillar} />
        </section>

      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify manually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/admin/kpis` as an ADMIN user.

Verify:
- Sector dropdown shows 3 options; selecting one filters the department dropdown
- Filling the form and clicking "إضافة مؤشر" creates the KPI and refreshes the grid
- Duplicate name in same pillar shows Arabic error message
- KpiGrid below shows existing KPIs for selected department; pencil icon opens KpiEditModal

- [ ] **Step 4: Commit**

```bash
git add app/admin/kpis/page.tsx
git commit -m "feat(admin): add KPI management page at /admin/kpis with two-step sector→dept selector"
```

---

## Task 6: Navigation changes + remove Excel upload

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Delete: `app/upload/page.tsx`
- Delete: `app/upload/submissions/page.tsx`
- Delete: `app/api/upload/route.ts`
- Delete: `app/api/upload/submissions/route.ts`
- Delete: `components/upload/FileUploader.tsx`
- Delete: `components/upload/ValidationPreview.tsx`
- Delete: `components/upload/SubmissionsStatus.tsx`
- Delete: `lib/excel.ts`

- [ ] **Step 1: Read `components/layout/Sidebar.tsx`**

Read the file and find:
1. The existing upload nav link: `href="/upload"` with label `"رفع البيانات"` and icon `Upload`
2. The import block at the top (to add new icons)
3. Where ADMIN-only nav items are defined (the block with `/admin/submissions`, `/admin/audit`, `/admin/users`)

- [ ] **Step 2: Update the sidebar**

In `components/layout/Sidebar.tsx`:

**a) Replace the upload nav link** (for EDITOR/ADMIN) with the data entry link:

Replace:
```tsx
{(role === 'ADMIN' || role === 'EDITOR') && (
  <NavLink
    href="/upload"
    icon={Upload}
    label="رفع البيانات"
    active={pathname === '/upload'}
    expanded={expanded}
    onNavigate={onNavigate}
  />
)}
```

With:
```tsx
{(role === 'ADMIN' || role === 'EDITOR') && (
  <NavLink
    href="/dashboard/entry"
    icon={ClipboardEdit}
    label="إدخال البيانات"
    active={pathname === '/dashboard/entry'}
    expanded={expanded}
    onNavigate={onNavigate}
  />
)}
```

**b) Add "إدارة المؤشرات" inside the ADMIN-only block**, after the `/admin/users` link:

```tsx
<NavLink
  href="/admin/kpis"
  icon={LayoutList}
  label="إدارة المؤشرات"
  active={pathname === '/admin/kpis'}
  expanded={expanded}
  onNavigate={onNavigate}
/>
```

**c) Update icon imports** — add `ClipboardEdit` and `LayoutList` from lucide-react, remove `Upload` if it is only used for the upload link (check the file first — if `Upload` is used elsewhere, keep it).

```ts
import { ..., ClipboardEdit, LayoutList } from 'lucide-react'
```

- [ ] **Step 3: Verify the sidebar type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Delete Excel upload files**

```bash
rm app/upload/page.tsx
rm app/upload/submissions/page.tsx
rm app/api/upload/route.ts
rm app/api/upload/submissions/route.ts
rm components/upload/FileUploader.tsx
rm components/upload/ValidationPreview.tsx
rm components/upload/SubmissionsStatus.tsx
rm lib/excel.ts
```

- [ ] **Step 5: Check for remaining imports of deleted files**

```bash
grep -r "from.*lib/excel\|from.*components/upload\|from.*api/upload\|href.*\/upload" \
  --include="*.ts" --include="*.tsx" \
  app components lib \
  | grep -v node_modules
```

For each match found, remove or replace the import. The most common case will be the page that previously rendered `FileUploader` — that page is itself deleted in Step 4. If any other file imported from these paths, remove those imports now.

- [ ] **Step 6: Type-check the full project**

```bash
npx tsc --noEmit
```

Expected: no errors. If errors appear about deleted files, they are dangling imports — fix them by removing the import lines.

- [ ] **Step 7: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 8: Run dev server and do a full smoke test**

```bash
npm run dev
```

As EDITOR:
- Sidebar shows "إدخال البيانات" (not "رفع البيانات")
- Navigating to `/upload` returns 404 (expected — page deleted)
- `/dashboard/entry` loads correctly

As ADMIN:
- Sidebar shows "إدخال البيانات" and "إدارة المؤشرات"
- `/admin/kpis` loads correctly

- [ ] **Step 9: Commit**

```bash
git add components/layout/Sidebar.tsx
git rm app/upload/page.tsx app/upload/submissions/page.tsx \
       app/api/upload/route.ts app/api/upload/submissions/route.ts \
       components/upload/FileUploader.tsx components/upload/ValidationPreview.tsx \
       components/upload/SubmissionsStatus.tsx lib/excel.ts
git commit -m "feat(nav): replace Excel upload with form entry; add admin KPI management link"
```
