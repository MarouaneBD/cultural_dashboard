# Institutional Support Sector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the قطاع الدعم المؤسسي division with 3 placeholder departments (HR, Admin Affairs, Procurement), full department dashboard pages backed by dummy data, a dummy-data warning banner, and division-aware KPI filtering throughout the UI.

**Architecture:** New Prisma `Pillar` enum values enable the existing upload flow from day 1. A `division` field added to `lib/departments.ts` drives filtering in every component that lists departments or fetches KPIs. Static dummy `DeptData` files follow the same shape as existing departments — the `DepartmentDashboard` fallback (`dbData ?? staticData`) replaces them automatically once real data is uploaded.

**Tech Stack:** Next.js App Router, Prisma ORM, React Query, TypeScript

## Global Constraints

- All Arabic strings use the exact text from the spec — do not paraphrase
- New Pillar enum values: `HR_MANAGEMENT`, `ADMIN_AFFAIRS`, `PROCUREMENT`
- Migration must be additive only — no existing data touched
- Dummy data files must satisfy `DeptData` from `types/department.ts` exactly
- `tsc --noEmit` must pass after every task
- No new npm packages

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add 3 Pillar enum values |
| `types/index.ts` | Modify | Extend PillarId union |
| `lib/departments.ts` | Modify | Add `division` field + 3 new dept entries |
| `lib/divisions.ts` | Modify | Mark INSTITUTIONAL_SUPPORT active |
| `lib/excel.ts` | Modify | Add 3 Arabic names to DEPT_NAME_TO_PILLAR |
| `app/api/kpis/route.ts` | Modify | Add `division` query param filter |
| `app/api/kpis/route.test.ts` | Modify | Test division filter |
| `data/departments/hr-management.ts` | Create | Dummy DeptData for HR |
| `data/departments/admin-affairs.ts` | Create | Dummy DeptData for Admin Affairs |
| `data/departments/procurement.ts` | Create | Dummy DeptData for Procurement |
| `data/departments/registry.ts` | Modify | Register 3 new depts |
| `components/layout/DummyDataBanner.tsx` | Create | Amber dismissible warning banner |
| `components/kpi/DivisionStats.tsx` | Modify | Pass division to API, dynamic dept count |
| `components/narrative/ExecutiveSummary.tsx` | Modify | Pass division to API query |
| `components/kpi/DeptOverview.tsx` | Modify | Filter departments by division |
| `components/DashboardContent.tsx` | Modify | Division-has-depts check + DummyDataBanner |

---

### Task 1: Prisma schema migration + PillarId type

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `types/index.ts`

**Interfaces:**
- Produces: `PillarId` includes `'HR_MANAGEMENT' | 'ADMIN_AFFAIRS' | 'PROCUREMENT'`

- [ ] **Step 1: Add enum values to schema**

In `prisma/schema.prisma`, find the `Pillar` enum block and append the 3 new values:

```prisma
enum Pillar {
  EDUCATION
  FAMILY_CULTURE
  ISLAMIC_INFO_CENTER
  AL_BIRR_MALE
  AL_BIRR_FEMALE
  ORPHANS
  SCIENTIFIC_PROGRAMS
  RESEARCH_PUBLICATIONS
  HR_MANAGEMENT
  ADMIN_AFFAIRS
  PROCUREMENT
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-institutional-support-pillars
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Extend PillarId in `types/index.ts`**

```ts
export type PillarId =
  | 'EDUCATION'
  | 'FAMILY_CULTURE'
  | 'ISLAMIC_INFO_CENTER'
  | 'AL_BIRR_MALE'
  | 'AL_BIRR_FEMALE'
  | 'ORPHANS'
  | 'SCIENTIFIC_PROGRAMS'
  | 'RESEARCH_PUBLICATIONS'
  | 'HR_MANAGEMENT'
  | 'ADMIN_AFFAIRS'
  | 'PROCUREMENT'
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations types/index.ts
git commit -m "feat: add HR_MANAGEMENT, ADMIN_AFFAIRS, PROCUREMENT pillar enum values"
```

---

### Task 2: Lib layer — departments, divisions, excel

**Files:**
- Modify: `lib/departments.ts`
- Modify: `lib/divisions.ts`
- Modify: `lib/excel.ts`

**Interfaces:**
- Produces: `DEPARTMENTS[n].division` field typed as `DivisionId`
- Produces: `DEPARTMENTS.filter(d => d.division === 'INSTITUTIONAL_SUPPORT')` returns 3 items
- Produces: `DEPT_NAME_TO_PILLAR['ادارة الموارد البشرية']` returns `'HR_MANAGEMENT'`

- [ ] **Step 1: Add `division` field to `lib/departments.ts`**

Replace the entire file contents:

```ts
import type { DivisionId } from '@/lib/divisions'

export const DEPARTMENTS = [
  { id: 'EDUCATION',             labelAr: 'ادارة التعليم',              icon: '📚', color: '#0284c7', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'FAMILY_CULTURE',        labelAr: 'ادارة ثقافة الأسرة',        icon: '👨‍👩‍👧', color: '#7c3aed', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'ISLAMIC_INFO_CENTER',   labelAr: 'مركز المعلومات الاسلامي',   icon: '🕌', color: '#059669', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'AL_BIRR_MALE',          labelAr: 'مشروع البر - ذكور',         icon: '👦', color: '#0369a1', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'AL_BIRR_FEMALE',        labelAr: 'مشروع البر - اناث',         icon: '👧', color: '#0d9488', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'ORPHANS',               labelAr: 'قسم الأيتام',               icon: '🤲', color: '#d97706', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'SCIENTIFIC_PROGRAMS',   labelAr: 'مكتب البرامج العلمية',      icon: '📖', color: '#6d28d9', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'RESEARCH_PUBLICATIONS', labelAr: 'وحدة البحوث والمطبوعات',    icon: '📝', color: '#0369a1', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'HR_MANAGEMENT',         labelAr: 'ادارة الموارد البشرية',     icon: '👥', color: '#0e7490', division: 'INSTITUTIONAL_SUPPORT' as DivisionId },
  { id: 'ADMIN_AFFAIRS',         labelAr: 'ادارة الشؤون الادارية',     icon: '🏛️', color: '#7c3aed', division: 'INSTITUTIONAL_SUPPORT' as DivisionId },
  { id: 'PROCUREMENT',           labelAr: 'ادارة المشتريات',            icon: '📦', color: '#b45309', division: 'INSTITUTIONAL_SUPPORT' as DivisionId },
] as const

export type DeptId = typeof DEPARTMENTS[number]['id']

export const DEPT_MAP = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
) as Record<DeptId, typeof DEPARTMENTS[number]>

export const VALID_PILLAR_IDS = new Set<string>(DEPARTMENTS.map(d => d.id))
```

- [ ] **Step 2: Mark INSTITUTIONAL_SUPPORT active in `lib/divisions.ts`**

Change `active: false` to `active: true` for INSTITUTIONAL_SUPPORT only:

```ts
export const DIVISIONS = [
  {
    id: 'CULTURE_RESEARCH',
    labelAr: 'قطاع الثقافة والبحوث',
    shortAr: 'الثقافة والبحوث',
    icon: '◈',
    active: true,
  },
  {
    id: 'INSTITUTIONAL_SUPPORT',
    labelAr: 'قطاع الدعم المؤسسي',
    shortAr: 'الدعم المؤسسي',
    icon: '◉',
    active: true,
  },
  {
    id: 'ZAKAT_DEVELOPMENT',
    labelAr: 'قطاع الزكاة والمشاريع التنموية',
    shortAr: 'الزكاة والمشاريع',
    icon: '◎',
    active: false,
  },
] as const
```

- [ ] **Step 3: Add 3 Arabic dept names to `lib/excel.ts` DEPT_NAME_TO_PILLAR**

Find the `DEPT_NAME_TO_PILLAR` record in `lib/excel.ts` and add 3 lines:

```ts
const DEPT_NAME_TO_PILLAR: Record<string, string> = {
  'ادارة التعليم':              'EDUCATION',
  'ادارة ثقافة الأسرة':        'FAMILY_CULTURE',
  'مركز المعلومات الاسلامي':   'ISLAMIC_INFO_CENTER',
  'مشروع البر - ذكور':         'AL_BIRR_MALE',
  'مشروع البر - اناث':         'AL_BIRR_FEMALE',
  'قسم الأيتام':                'ORPHANS',
  'مكتب البرامج العلمية':       'SCIENTIFIC_PROGRAMS',
  'وحدة البحوث والمطبوعات':    'RESEARCH_PUBLICATIONS',
  'ادارة الموارد البشرية':      'HR_MANAGEMENT',
  'ادارة الشؤون الادارية':      'ADMIN_AFFAIRS',
  'ادارة المشتريات':            'PROCUREMENT',
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/departments.ts lib/divisions.ts lib/excel.ts
git commit -m "feat: add division field to departments and activate institutional support"
```

---

### Task 3: Division filter in /api/kpis

**Files:**
- Modify: `app/api/kpis/route.ts`
- Modify: `app/api/kpis/route.test.ts`

**Interfaces:**
- Consumes: `DEPARTMENTS` from `lib/departments.ts` (has `division` field from Task 2)
- Produces: `GET /api/kpis?division=INSTITUTIONAL_SUPPORT` returns only KPIs whose pillar is in `{HR_MANAGEMENT, ADMIN_AFFAIRS, PROCUREMENT}`

- [ ] **Step 1: Write the failing test**

In `app/api/kpis/route.test.ts`, add a new `describe` block after the existing tests:

```ts
describe('GET /api/kpis — division filter', () => {
  it('filters KPIs to pillars belonging to the requested division', async () => {
    // The mock returns a single KPI with pillar EDUCATION (CULTURE_RESEARCH).
    // Requesting INSTITUTIONAL_SUPPORT should return empty — EDUCATION is not in that division.
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL&division=INSTITUTIONAL_SUPPORT')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(0)
  })

  it('returns all KPIs when no division param is given', async () => {
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest app/api/kpis/route.test.ts --no-coverage
```

Expected: new division filter test FAILs (returns 1 item, expects 0).

- [ ] **Step 3: Implement division filter in `app/api/kpis/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import { DEPARTMENTS } from '@/lib/departments'
import type { KpiWithVariance } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = searchParams.get('period') ?? 'ANNUAL'
  const pillar = searchParams.get('pillar') ?? undefined
  const division = searchParams.get('division') ?? undefined

  // Build pillar filter: division takes precedence over single pillar param
  let pillarFilter: string[] | undefined
  if (division) {
    pillarFilter = DEPARTMENTS
      .filter(d => d.division === division)
      .map(d => d.id)
  } else if (pillar) {
    pillarFilter = [pillar]
  }

  try {
    const kpis = await prisma.kpiRegistry.findMany({
      where: pillarFilter ? { pillar: { in: pillarFilter as any[] } } : undefined,
      include: {
        targets: { where: { year } },
        actuals: { where: { year }, orderBy: { period: 'asc' } },
      },
    })

    const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

    const result: KpiWithVariance[] = kpis.map(kpi => {
      const sparkline = QUARTERS.map(q => kpi.actuals.find(x => x.period === q)?.value ?? 0)

      let variance: KpiWithVariance['variance']

      if (period === 'ANNUAL') {
        const annualActual = kpi.actuals.find(a => a.period === 'ANNUAL')
        const annualTarget = kpi.targets.find(t => t.period === 'ANNUAL')?.value ?? 0

        if (annualActual) {
          variance = computeVariance(annualActual.value, annualTarget)
        } else {
          const qActuals = QUARTERS.map(q => kpi.actuals.find(a => a.period === q)?.value)
            .filter((v): v is number => v != null)

          if (qActuals.length === 0) {
            variance = { actual: 0, target: annualTarget, pct: 0, color: 'neutral' }
          } else {
            const ytdActual = kpi.activityType === 'CUMULATIVE'
              ? qActuals.reduce((a, b) => a + b, 0)
              : qActuals[qActuals.length - 1]
            const proportionalTarget = annualTarget * (qActuals.length / 4)
            variance = computeVariance(ytdActual, proportionalTarget)
          }
        }
      } else {
        const target = kpi.targets.find(t => t.period === period)
        const actual = kpi.actuals.find(a => a.period === period)
        variance = computeVariance(actual?.value ?? 0, target?.value ?? 0)
      }

      return {
        id: kpi.id,
        nameAr: kpi.nameAr,
        pillar: kpi.pillar as KpiWithVariance['pillar'],
        unit: kpi.unit as KpiWithVariance['unit'],
        variance,
        sparkline,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/kpis failed', err)
    return NextResponse.json({ error: 'خطأ في تحميل البيانات' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run all KPI route tests**

```bash
npx jest app/api/kpis/route.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/kpis/route.ts app/api/kpis/route.test.ts
git commit -m "feat: add division query param to /api/kpis for sector-scoped KPI fetching"
```

---

### Task 4: Dummy data files + registry

**Files:**
- Create: `data/departments/hr-management.ts`
- Create: `data/departments/admin-affairs.ts`
- Create: `data/departments/procurement.ts`
- Modify: `data/departments/registry.ts`

**Interfaces:**
- Consumes: `DeptData` from `types/department.ts`, `DeptConfig` from `components/department/DepartmentDashboard.tsx`
- Consumes: `PillarId` includes `HR_MANAGEMENT | ADMIN_AFFAIRS | PROCUREMENT` (Task 1)
- Produces: `DEPT_DASHBOARDS['HR_MANAGEMENT']` returns a valid `DeptConfig`

- [ ] **Step 1: Create `data/departments/hr-management.ts`**

```ts
// Department data for: ادارة الموارد البشرية (HR_MANAGEMENT)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const hrManagementData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'عدد الموظفين',             value: 142, unit: '',  icon: 'Users' },
      { labelAr: 'نسبة الالتزام بالحضور',     value: 94,  unit: '%', icon: 'CheckCircle' },
      { labelAr: 'عدد الدورات التدريبية',     value: 28,  unit: '',  icon: 'BookOpen' },
      { labelAr: 'رضا الموظفين',              value: 82,  unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 88 },
      { month: 'Feb', value: 90 },
      { month: 'Mar', value: 92 },
      { month: 'Apr', value: 91 },
      { month: 'May', value: 93 },
      { month: 'Jun', value: 94 },
      { month: 'Jul', value: 92 },
      { month: 'Aug', value: 91 },
      { month: 'Sep', value: 93 },
      { month: 'Oct', value: 94 },
      { month: 'Nov', value: 93 },
      { month: 'Dec', value: 94 },
    ],
    categoryBreakdown: [
      { nameAr: 'التوظيف والاستقطاب',   value: 30 },
      { nameAr: 'التدريب والتطوير',       value: 35 },
      { nameAr: 'شؤون الموظفين',          value: 25 },
      { nameAr: 'الرواتب والمزايا',       value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 88, target: 90 },
      { quarter: 'Q2', achieved: 91, target: 90 },
      { quarter: 'Q3', achieved: 93, target: 92 },
      { quarter: 'Q4', achieved: 94, target: 92 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'عدد الموظفين', target: 155, current: 148, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 142,
        quarters: [
          { q: 'Q1', actual: 145, target: 148 },
          { q: 'Q2', actual: 148, target: 150 },
          { q: 'Q3', actual: null, target: 152 },
          { q: 'Q4', actual: null, target: 155 },
        ],
      },
      {
        labelAr: 'معدل دوران الموظفين', target: 6, current: 7, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lowerIsBetter: true,
        lastYearValue: 8,
        quarters: [
          { q: 'Q1', actual: 7,    target: 7 },
          { q: 'Q2', actual: 7,    target: 6 },
          { q: 'Q3', actual: null, target: 6 },
          { q: 'Q4', actual: null, target: 6 },
        ],
      },
      {
        labelAr: 'نسبة الالتزام بالحضور', target: 96, current: 95, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 94,
        quarters: [
          { q: 'Q1', actual: 95,   target: 96 },
          { q: 'Q2', actual: 95,   target: 96 },
          { q: 'Q3', actual: null, target: 96 },
          { q: 'Q4', actual: null, target: 96 },
        ],
      },
      {
        labelAr: 'عدد الدورات التدريبية', target: 35, current: 16, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 28,
        quarters: [
          { q: 'Q1', actual: 8,    target: 9 },
          { q: 'Q2', actual: 8,    target: 9 },
          { q: 'Q3', actual: null, target: 9 },
          { q: 'Q4', actual: null, target: 8 },
        ],
      },
      {
        labelAr: 'رضا الموظفين', target: 88, current: 85, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 82,
        quarters: [
          { q: 'Q1', actual: 84,   target: 88 },
          { q: 'Q2', actual: 85,   target: 88 },
          { q: 'Q3', actual: null, target: 88 },
          { q: 'Q4', actual: null, target: 88 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 90,   target: 90 },
      { month: 'Feb', actual: 91,   target: 91 },
      { month: 'Mar', actual: 92,   target: 92 },
      { month: 'Apr', actual: 93,   target: 93 },
      { month: 'May', actual: 92,   target: 93 },
      { month: 'Jun', actual: 93,   target: 94 },
      { month: 'Jul', actual: null, target: 94 },
      { month: 'Aug', actual: null, target: 94 },
      { month: 'Sep', actual: null, target: 95 },
      { month: 'Oct', actual: null, target: 95 },
      { month: 'Nov', actual: null, target: 96 },
      { month: 'Dec', actual: null, target: 96 },
    ],
  },
}
```

- [ ] **Step 2: Create `data/departments/admin-affairs.ts`**

```ts
// Department data for: ادارة الشؤون الادارية (ADMIN_AFFAIRS)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const adminAffairsData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'المعاملات المنجزة',         value: 3840, unit: '',    icon: 'FileCheck' },
      { labelAr: 'متوسط وقت الإنجاز',         value: 3.2,  unit: ' يوم', icon: 'Clock' },
      { labelAr: 'نسبة رضا المراجعين',         value: 87,   unit: '%',   icon: 'Star' },
      { labelAr: 'الاجتماعات المنعقدة',         value: 96,   unit: '',    icon: 'Users' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 310 },
      { month: 'Feb', value: 295 },
      { month: 'Mar', value: 330 },
      { month: 'Apr', value: 318 },
      { month: 'May', value: 325 },
      { month: 'Jun', value: 340 },
      { month: 'Jul', value: 298 },
      { month: 'Aug', value: 305 },
      { month: 'Sep', value: 322 },
      { month: 'Oct', value: 335 },
      { month: 'Nov', value: 328 },
      { month: 'Dec', value: 314 },
    ],
    categoryBreakdown: [
      { nameAr: 'المراسلات الرسمية',  value: 40 },
      { nameAr: 'إدارة العقود',        value: 25 },
      { nameAr: 'الاجتماعات',          value: 20 },
      { nameAr: 'الأرشفة والتوثيق',    value: 15 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 935,  target: 950 },
      { quarter: 'Q2', achieved: 983,  target: 960 },
      { quarter: 'Q3', achieved: 925,  target: 960 },
      { quarter: 'Q4', achieved: 997,  target: 970 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'عدد المعاملات المنجزة', target: 4200, current: 2040, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 3840,
        quarters: [
          { q: 'Q1', actual: 1020, target: 1050 },
          { q: 'Q2', actual: 1020, target: 1050 },
          { q: 'Q3', actual: null, target: 1050 },
          { q: 'Q4', actual: null, target: 1050 },
        ],
      },
      {
        labelAr: 'متوسط وقت إنجاز المعاملة (يوم)', target: 2.5, current: 2.8, unit: ' يوم',
        activityType: 'MONTHLY_VARIANCE',
        lowerIsBetter: true,
        lastYearValue: 3.2,
        quarters: [
          { q: 'Q1', actual: 3,    target: 3 },
          { q: 'Q2', actual: 2.8,  target: 2.8 },
          { q: 'Q3', actual: null, target: 2.6 },
          { q: 'Q4', actual: null, target: 2.5 },
        ],
      },
      {
        labelAr: 'نسبة رضا المراجعين', target: 92, current: 89, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 87,
        quarters: [
          { q: 'Q1', actual: 88,   target: 90 },
          { q: 'Q2', actual: 89,   target: 91 },
          { q: 'Q3', actual: null, target: 91 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
      {
        labelAr: 'عدد الاجتماعات المنعقدة', target: 110, current: 54, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 96,
        quarters: [
          { q: 'Q1', actual: 26,   target: 28 },
          { q: 'Q2', actual: 28,   target: 28 },
          { q: 'Q3', actual: null, target: 27 },
          { q: 'Q4', actual: null, target: 27 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 335,  target: 330 },
      { month: 'Feb', actual: 342,  target: 335 },
      { month: 'Mar', actual: 343,  target: 340 },
      { month: 'Apr', actual: 340,  target: 340 },
      { month: 'May', actual: 338,  target: 345 },
      { month: 'Jun', actual: 342,  target: 345 },
      { month: 'Jul', actual: null, target: 348 },
      { month: 'Aug', actual: null, target: 350 },
      { month: 'Sep', actual: null, target: 352 },
      { month: 'Oct', actual: null, target: 355 },
      { month: 'Nov', actual: null, target: 355 },
      { month: 'Dec', actual: null, target: 360 },
    ],
  },
}
```

- [ ] **Step 3: Create `data/departments/procurement.ts`**

```ts
// Department data for: ادارة المشتريات (PROCUREMENT)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const procurementData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'قيمة العقود المبرمة',        value: 4200000, unit: ' د.إ', icon: 'DollarSign' },
      { labelAr: 'عدد العقود',                  value: 38,      unit: '',     icon: 'FileText' },
      { labelAr: 'نسبة الالتزام بالميزانية',    value: 91,      unit: '%',    icon: 'TrendingUp' },
      { labelAr: 'متوسط وقت إتمام المشتريات',   value: 18,      unit: ' يوم', icon: 'Clock' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 3 },
      { month: 'Feb', value: 4 },
      { month: 'Mar', value: 3 },
      { month: 'Apr', value: 4 },
      { month: 'May', value: 3 },
      { month: 'Jun', value: 3 },
      { month: 'Jul', value: 2 },
      { month: 'Aug', value: 3 },
      { month: 'Sep', value: 4 },
      { month: 'Oct', value: 3 },
      { month: 'Nov', value: 4 },
      { month: 'Dec', value: 2 },
    ],
    categoryBreakdown: [
      { nameAr: 'مشتريات تشغيلية',   value: 45 },
      { nameAr: 'عقود خدمات',          value: 30 },
      { nameAr: 'مشتريات رأسمالية',    value: 15 },
      { nameAr: 'مناقصات',             value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 10, target: 10 },
      { quarter: 'Q2', achieved: 10, target: 10 },
      { quarter: 'Q3', achieved: 9,  target: 10 },
      { quarter: 'Q4', achieved: 9,  target: 8 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'قيمة العقود المبرمة', target: 5000000, current: 2350000, unit: ' د.إ',
        activityType: 'CUMULATIVE',
        lastYearValue: 4200000,
        quarters: [
          { q: 'Q1', actual: 1150000, target: 1250000 },
          { q: 'Q2', actual: 1200000, target: 1250000 },
          { q: 'Q3', actual: null,    target: 1250000 },
          { q: 'Q4', actual: null,    target: 1250000 },
        ],
      },
      {
        labelAr: 'عدد العقود', target: 45, current: 22, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 38,
        quarters: [
          { q: 'Q1', actual: 11,   target: 11 },
          { q: 'Q2', actual: 11,   target: 11 },
          { q: 'Q3', actual: null, target: 12 },
          { q: 'Q4', actual: null, target: 11 },
        ],
      },
      {
        labelAr: 'نسبة الالتزام بالميزانية', target: 95, current: 92, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 91,
        quarters: [
          { q: 'Q1', actual: 91,   target: 93 },
          { q: 'Q2', actual: 92,   target: 94 },
          { q: 'Q3', actual: null, target: 95 },
          { q: 'Q4', actual: null, target: 95 },
        ],
      },
      {
        labelAr: 'متوسط وقت إتمام المشتريات (يوم)', target: 14, current: 16, unit: ' يوم',
        activityType: 'MONTHLY_VARIANCE',
        lowerIsBetter: true,
        lastYearValue: 18,
        quarters: [
          { q: 'Q1', actual: 17,   target: 16 },
          { q: 'Q2', actual: 16,   target: 15 },
          { q: 'Q3', actual: null, target: 14 },
          { q: 'Q4', actual: null, target: 14 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 380000,  target: 400000 },
      { month: 'Feb', actual: 395000,  target: 400000 },
      { month: 'Mar', actual: 375000,  target: 450000 },
      { month: 'Apr', actual: 410000,  target: 420000 },
      { month: 'May', actual: 390000,  target: 410000 },
      { month: 'Jun', actual: 400000,  target: 420000 },
      { month: 'Jul', actual: null,    target: 420000 },
      { month: 'Aug', actual: null,    target: 420000 },
      { month: 'Sep', actual: null,    target: 420000 },
      { month: 'Oct', actual: null,    target: 420000 },
      { month: 'Nov', actual: null,    target: 420000 },
      { month: 'Dec', actual: null,    target: 420000 },
    ],
  },
}
```

- [ ] **Step 4: Update `data/departments/registry.ts`**

```ts
// Registry of departments that have a full DepartmentDashboard data file.
// Adding a new dept = create data/departments/[slug].ts and add one entry here.

import type { DeptConfig } from '@/components/department/DepartmentDashboard'
import type { PillarId } from '@/types'
import { educationData }           from './education'
import { familyCultureData }       from './family-culture'
import { islamicInfoCenterData }   from './islamic-info-center'
import { alBirrMaleData }          from './al-birr-male'
import { alBirrFemaleData }        from './al-birr-female'
import { orphansData }             from './orphans'
import { scientificProgramsData }  from './scientific-programs'
import { researchPublicationsData } from './research-publications'
import { hrManagementData }        from './hr-management'
import { adminAffairsData }        from './admin-affairs'
import { procurementData }         from './procurement'

export const DEPT_DASHBOARDS: Record<PillarId, DeptConfig> = {
  EDUCATION:             { nameAr: 'ادارة التعليم',              icon: '📚', color: '#0284c7', data: educationData },
  FAMILY_CULTURE:        { nameAr: 'ادارة ثقافة الأسرة',        icon: '👨‍👩‍👧', color: '#7c3aed', data: familyCultureData },
  ISLAMIC_INFO_CENTER:   { nameAr: 'مركز المعلومات الاسلامي',   icon: '🕌', color: '#059669', data: islamicInfoCenterData },
  AL_BIRR_MALE:          { nameAr: 'مشروع البر - ذكور',         icon: '👦', color: '#0369a1', data: alBirrMaleData },
  AL_BIRR_FEMALE:        { nameAr: 'مشروع البر - اناث',         icon: '👧', color: '#0d9488', data: alBirrFemaleData },
  ORPHANS:               { nameAr: 'قسم الأيتام',               icon: '🤲', color: '#d97706', data: orphansData },
  SCIENTIFIC_PROGRAMS:   { nameAr: 'مكتب البرامج العلمية',      icon: '📖', color: '#6d28d9', data: scientificProgramsData },
  RESEARCH_PUBLICATIONS: { nameAr: 'وحدة البحوث والمطبوعات',    icon: '📝', color: '#0369a1', data: researchPublicationsData },
  HR_MANAGEMENT:         { nameAr: 'ادارة الموارد البشرية',     icon: '👥', color: '#0e7490', data: hrManagementData },
  ADMIN_AFFAIRS:         { nameAr: 'ادارة الشؤون الادارية',     icon: '🏛️', color: '#7c3aed', data: adminAffairsData },
  PROCUREMENT:           { nameAr: 'ادارة المشتريات',            icon: '📦', color: '#b45309', data: procurementData },
}
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add data/departments/hr-management.ts data/departments/admin-affairs.ts data/departments/procurement.ts data/departments/registry.ts
git commit -m "feat: add dummy dept data for HR, Admin Affairs, and Procurement"
```

---

### Task 5: DummyDataBanner component

**Files:**
- Create: `components/layout/DummyDataBanner.tsx`

**Interfaces:**
- Produces: `<DummyDataBanner division={divisionParam} />` — renders amber banner when `division === 'INSTITUTIONAL_SUPPORT'`, null otherwise. Dismissible via session storage.

- [ ] **Step 1: Create `components/layout/DummyDataBanner.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import type { DivisionId } from '@/lib/divisions'

const DISMISS_KEY = 'institutional-support-banner-dismissed'

interface Props {
  division: DivisionId
}

export function DummyDataBanner({ division }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (division !== 'INSTITUTIONAL_SUPPORT') return
    const dismissed = sessionStorage.getItem(DISMISS_KEY)
    if (!dismissed) setVisible(true)
  }, [division])

  if (!visible) return null

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border"
      style={{
        background: 'rgba(251,191,36,.10)',
        borderColor: 'rgba(251,191,36,.35)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ fontSize: '15px', flexShrink: 0 }}>⚠️</span>
        <p className="font-cairo text-[13px] leading-snug" style={{ color: 'var(--ink)' }}>
          البيانات المعروضة تجريبية لأغراض العرض — ستُستبدل عند رفع البيانات الفعلية
        </p>
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-[18px] leading-none transition-opacity hover:opacity-60"
        style={{ color: 'var(--ink-muted)' }}
        aria-label="إغلاق"
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/DummyDataBanner.tsx
git commit -m "feat: add DummyDataBanner component for institutional support sector"
```

---

### Task 6: Wire division-awareness into UI components

**Files:**
- Modify: `components/kpi/DivisionStats.tsx`
- Modify: `components/narrative/ExecutiveSummary.tsx`
- Modify: `components/kpi/DeptOverview.tsx`
- Modify: `components/DashboardContent.tsx`

**Interfaces:**
- Consumes: `DummyDataBanner` from Task 5
- Consumes: `DEPARTMENTS` with `division` field from Task 2
- Consumes: `/api/kpis?division=` from Task 3

- [ ] **Step 1: Update `components/kpi/DivisionStats.tsx`**

Add `useSearchParams` (already imported), read `divisionParam`, pass it to the query. Replace hardcoded `'8'` with dynamic count.

Replace the entire `DivisionStats` function and the `buildStats` helper (lines 27–80 in the original file):

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Building2, BarChart3, CheckCircle2, AlertCircle, XCircle, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DEPARTMENTS } from '@/lib/departments'
import { DEFAULT_DIVISION, type DivisionId } from '@/lib/divisions'
import type { KpiWithVariance } from '@/types'

const PERIOD_LABELS: Record<string, string> = {
  ANNUAL: 'سنوي',
  Q1: 'الربع الأول',
  Q2: 'الربع الثاني',
  Q3: 'الربع الثالث',
  Q4: 'الربع الرابع',
}

type StatItem = {
  labelAr: string
  value: string
  Icon: LucideIcon
  note: string
  highlight?: boolean
  color?: string
  bgColor?: string
}

function buildStats(kpis: KpiWithVariance[], deptCount: number): StatItem[] {
  const green  = kpis.filter(k => k.variance.color === 'green').length
  const amber  = kpis.filter(k => k.variance.color === 'amber').length
  const red    = kpis.filter(k => k.variance.color === 'red').length
  const rated  = kpis.filter(k => k.variance.color !== 'neutral')
  const avg    = rated.length
    ? Math.round(rated.reduce((s, k) => s + k.variance.pct, 0) / rated.length)
    : 0

  return [
    { labelAr: 'الوحدات التنظيمية', value: String(deptCount), Icon: Building2, note: 'departments' },
    { labelAr: 'المؤشرات',           value: String(kpis.length), Icon: BarChart3, note: 'kpis' },
    { labelAr: 'على المسار',          value: String(green), Icon: CheckCircle2, note: 'on-track',  color: '#4ade80', bgColor: 'rgba(74,222,128,.18)' },
    { labelAr: 'تحتاج متابعة',        value: String(amber), Icon: AlertCircle,  note: 'at-risk',   color: '#fbbf24', bgColor: 'rgba(251,191,36,.18)' },
    { labelAr: 'تحتاج تدخل',          value: String(red),   Icon: XCircle,      note: 'critical',  color: '#f87171', bgColor: 'rgba(248,113,113,.18)' },
    { labelAr: 'نسبة الإنجاز',        value: `${avg}٪`,     Icon: TrendingUp,   note: 'completion', highlight: true },
  ]
}

const SKELETON_STATS: StatItem[] = [
  { labelAr: 'الوحدات التنظيمية', value: '—', Icon: Building2,   note: 'departments' },
  { labelAr: 'المؤشرات',           value: '—', Icon: BarChart3,   note: 'kpis' },
  { labelAr: 'على المسار',          value: '—', Icon: CheckCircle2, note: 'on-track' },
  { labelAr: 'تحتاج متابعة',        value: '—', Icon: AlertCircle, note: 'at-risk' },
  { labelAr: 'تحتاج تدخل',          value: '—', Icon: XCircle,     note: 'critical' },
  { labelAr: 'نسبة الإنجاز',        value: '—', Icon: TrendingUp,  note: 'completion', highlight: true },
]

export function DivisionStats() {
  const searchParams = useSearchParams()
  const year         = searchParams.get('year')     ?? '2026'
  const period       = searchParams.get('period')   ?? 'ANNUAL'
  const divisionParam = (searchParams.get('division') ?? DEFAULT_DIVISION) as DivisionId
  const periodLabel  = PERIOD_LABELS[period] ?? period

  const deptCount = DEPARTMENTS.filter(d => d.division === divisionParam).length

  const { data: kpis } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period, divisionParam],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}&division=${divisionParam}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const stats = kpis ? buildStats(kpis, deptCount) : SKELETON_STATS

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{ background: 'var(--sidebar-bg)', boxShadow: '0 4px 28px rgba(0,0,0,.20)' }}
    >
      {/* Header strip */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,.09)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
            style={{ background: 'rgba(184,130,42,.22)', color: 'var(--gold)' }}
          >
            ✦
          </span>
          <span
            className="font-space font-semibold text-[10.5px] tracking-[.12em] uppercase"
            style={{ color: 'var(--gold)' }}
          >
            نظرة عامة على القطاع
          </span>
        </div>
        <span className="font-jb text-[10px]" style={{ color: 'rgba(255,255,255,.40)' }}>
          {year} · {periodLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6">
        {stats.map((s, i) => (
          <div
            key={s.note}
            className="flex flex-col items-center justify-center gap-2 py-5 px-3 text-center"
            style={{ borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,.08)' : 'none' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: s.bgColor ?? (s.highlight ? 'rgba(184,130,42,.20)' : 'rgba(255,255,255,.10)') }}
            >
              <s.Icon size={15} strokeWidth={2} color={s.color ?? (s.highlight ? 'var(--gold)' : 'rgba(255,255,255,.80)')} />
            </div>
            <span
              className="font-fraunces font-medium leading-none"
              style={{ fontSize: '24px', color: s.color ?? (s.highlight ? 'var(--gold)' : '#ffffff'), letterSpacing: '-.02em' }}
            >
              {s.value}
            </span>
            <span className="font-cairo text-[10.5px] leading-tight" style={{ color: 'rgba(255,255,255,.60)' }}>
              {s.labelAr}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `components/narrative/ExecutiveSummary.tsx`**

Add `DEFAULT_DIVISION` import and division param to the query. Replace the two `useQuery` lines (lines 13–19) and the `params` usages:

```tsx
const params        = useSearchParams()
const year          = params.get('year')     ?? '2026'
const period        = params.get('period')   ?? 'ANNUAL'
const divisionParam = (params.get('division') ?? DEFAULT_DIVISION) as DivisionId

const { data: kpis, error, isLoading } = useQuery<KpiWithVariance[]>({
  queryKey: ['kpis', year, period, divisionParam],
  queryFn: () => fetch(`/api/kpis?year=${year}&period=${period}&division=${divisionParam}`).then(r => {
    if (!r.ok) throw new Error(`API ${r.status}`)
    return r.json()
  }),
})
```

Also add the missing imports at the top of the file:

```ts
import { DEFAULT_DIVISION, type DivisionId } from '@/lib/divisions'
```

- [ ] **Step 3: Update `components/kpi/DeptOverview.tsx`**

Add division-based filtering. Replace the `byDept` and `visibleDepts` logic:

At the top of `DeptOverview`, add imports:
```ts
import { DEFAULT_DIVISION, type DivisionId } from '@/lib/divisions'
```

Inside `DeptOverview` function, after the `params` line, add:
```ts
const divisionParam = (params.get('division') ?? DEFAULT_DIVISION) as DivisionId
const divisionDepts = DEPARTMENTS.filter(d => d.division === divisionParam)
```

Replace the existing `byDept` line:
```ts
const byDept = Object.fromEntries(
  divisionDepts.map(d => [d.id, (kpis ?? []).filter(k => k.pillar === d.id)])
)
```

Replace the `visibleDepts` logic:
```ts
const visibleDepts = (role === 'EDITOR' && assignedPillarId)
  ? divisionDepts.filter(d => d.id === assignedPillarId)
  : divisionDepts
```

Also update the query to pass division (keeps the cache in sync with DivisionStats):
```ts
const { data: kpis, isLoading } = useQuery<KpiWithVariance[]>({
  queryKey: ['kpis', year, period, divisionParam],
  queryFn: () =>
    fetch(`/api/kpis?year=${year}&period=${period}&division=${divisionParam}`).then(r => {
      if (!r.ok) throw new Error(`API ${r.status}`)
      return r.json()
    }),
})
```

- [ ] **Step 4: Update `components/DashboardContent.tsx`**

Replace the `isActiveDivision` check with a division-has-departments check, and add the `DummyDataBanner`. Full replacement of the `DashboardContent` function:

```tsx
'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { DeptOverview } from '@/components/kpi/DeptOverview'
import { DivisionStats } from '@/components/kpi/DivisionStats'
import { DrillDownModal } from '@/components/kpi/DrillDownModal'
import { ExecutiveSummary } from '@/components/narrative/ExecutiveSummary'
import { BeneficiaryChart } from '@/components/kpi/BeneficiaryChart'
import { DummyDataBanner } from '@/components/layout/DummyDataBanner'
import { DEPARTMENTS, DEPT_MAP } from '@/lib/departments'
import { DIVISION_MAP, DEFAULT_DIVISION, type DivisionId } from '@/lib/divisions'
import type { KpiWithVariance, PillarId } from '@/types'

function ComingSoon({ division }: { division: DivisionId }) {
  const div = DIVISION_MAP[division]
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: 'var(--bg-alt)' }}
      >
        {div?.icon ?? '◉'}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-cairo font-bold text-[20px]" style={{ color: 'var(--ink)' }}>
          {div?.labelAr}
        </h2>
        <p className="font-cairo text-[14px]" style={{ color: 'var(--ink-muted)' }}>
          لوحة تحكم هذا القطاع قيد الإعداد وستكون متاحة قريباً
        </p>
      </div>
      <div
        className="font-space font-semibold text-[11px] tracking-[.16em] uppercase px-4 py-2 rounded-lg"
        style={{ background: 'rgba(184,130,42,.15)', color: 'var(--gold)' }}
      >
        قريباً
      </div>
    </div>
  )
}

const DepartmentDashboard = dynamic(
  () => import('@/components/department/DepartmentDashboard').then(m => ({ default: m.DepartmentDashboard })),
  {
    loading: () => (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 rounded-xl" style={{ background: 'var(--bg-alt)' }} />
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-alt)' }} />
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-alt)' }} />
      </div>
    ),
    ssr: false,
  }
)

function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-[12px] transition-colors"
      style={{ color: 'var(--ink-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-muted)')}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      الرئيسية
    </Link>
  )
}

export function DashboardContent() {
  const params = useSearchParams()
  const [selectedKpi, setSelectedKpi] = useState<KpiWithVariance | null>(null)

  const pillarParam   = params.get('pillar') as PillarId | null
  const divisionParam = (params.get('division') ?? DEFAULT_DIVISION) as DivisionId

  // A division is "live" if it has at least one department registered
  const divisionHasDepts = DEPARTMENTS.some(d => d.division === divisionParam)

  const activeDept = pillarParam ? DEPT_MAP[pillarParam as keyof typeof DEPT_MAP] : null
  const title = activeDept?.labelAr ?? (DIVISION_MAP[divisionParam]?.labelAr ?? 'لوحة تحكم')

  const homeHref = (() => {
    const next = new URLSearchParams(params.toString())
    next.delete('pillar')
    const qs = next.toString()
    return qs ? `/dashboard?${qs}` : '/dashboard'
  })()

  return (
    <AppShell title={title}>
      <div className="max-w-5xl mx-auto space-y-6">
        {!divisionHasDepts ? (
          <ComingSoon division={divisionParam} />
        ) : pillarParam ? (
          /* ── Dept detail view ── */
          <>
            <BackButton href={homeHref} />
            <DummyDataBanner division={divisionParam} />
            <DepartmentDashboard pillarId={pillarParam} />
          </>
        ) : (
          /* ── Sector homepage ── */
          <>
            <DummyDataBanner division={divisionParam} />
            <DivisionStats />
            <Suspense fallback={
              <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
            }>
              <ExecutiveSummary />
            </Suspense>
            <Suspense fallback={null}>
              <BeneficiaryChart />
            </Suspense>
            <Suspense fallback={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
                ))}
              </div>
            }>
              <DeptOverview />
            </Suspense>
          </>
        )}

        {selectedKpi && (
          <Suspense fallback={null}>
            <DrillDownModal kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />
          </Suspense>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 7: Start the dev server and verify manually**

```bash
npm run dev
```

Check:
1. Navigate to `/dashboard` — CULTURE_RESEARCH sector shows its 8 depts, no banner
2. Switch to قطاع الدعم المؤسسي — amber banner appears, 3 dept cards visible
3. Click ادارة الموارد البشرية — dept dashboard loads with dummy KPI data, banner still visible
4. Dismiss the banner — it disappears and does not reappear until session is cleared
5. قطاع الزكاة والمشاريع التنموية still shows ComingSoon screen

- [ ] **Step 8: Commit**

```bash
git add components/kpi/DivisionStats.tsx components/narrative/ExecutiveSummary.tsx components/kpi/DeptOverview.tsx components/DashboardContent.tsx
git commit -m "feat: wire division-aware routing, KPI filtering, and DummyDataBanner into dashboard"
```
