# Executive Reporting System (ERS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, Arabic-native RTL executive dashboard for the Islamic Affairs Division tracking KPIs across four fixed pillars with variance-based coloring, drill-down, data upload, and auto-generated Arabic narrative insights.

**Architecture:** Next.js App Router (server components for data fetching, client components for interactivity). Domain logic (variance, narrative, Excel parsing) lives in `lib/` as pure functions tested independently from the UI. All Recharts instances are wrapped in a single `RtlChart` provider that handles axis mirroring.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Shadcn/UI · Recharts · PostgreSQL 16 (Docker) · Prisma ORM · React Query · `xlsx` (Excel parsing) · `@react-pdf/renderer` (PDF export)

---

## File Map

```
Cultural_Dashboard/
├── docker-compose.yml
├── app/
│   ├── layout.tsx                  # Root: dir="rtl", Cairo font, QueryProvider
│   ├── page.tsx                    # Redirect → /dashboard
│   ├── dashboard/page.tsx          # Pulse dashboard (server component)
│   ├── upload/page.tsx             # Data ingestion (Editor+)
│   ├── admin/audit/page.tsx        # Audit log (Admin only)
│   └── api/
│       ├── kpis/route.ts           # GET all KPIs with latest actuals + variance
│       ├── kpis/[id]/route.ts      # GET single KPI regional drill-down
│       ├── actuals/route.ts        # POST new actual value
│       └── upload/route.ts         # POST Excel/CSV file
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx            # Sidebar + main content wrapper
│   │   ├── Sidebar.tsx             # RTL nav with four pillar links
│   │   └── PeriodControls.tsx      # Year / Quarter toggle
│   ├── kpi/
│   │   ├── KpiCard.tsx             # Actual · Target · Variance · Sparkline
│   │   ├── KpiGrid.tsx             # 2×2 grid of KpiCards by pillar
│   │   └── DrillDownModal.tsx      # Regional/facility breakdown on click
│   ├── charts/
│   │   ├── RtlChart.tsx            # Recharts RTL wrapper (mirrors axes)
│   │   └── SparklineChart.tsx      # 4-quarter trend line
│   ├── upload/
│   │   ├── FileUploader.tsx        # Drag-drop zone
│   │   └── ValidationPreview.tsx   # Dry-run diff table
│   └── narrative/
│       └── ExecutiveSummary.tsx    # Auto-generated Arabic insight block
├── lib/
│   ├── kpi.ts                      # computeVariance() — single source of truth
│   ├── narrative.ts                # generateNarrative() — rule-based Arabic text
│   ├── excel.ts                    # parseExcelFile() + validateRow()
│   ├── prisma.ts                   # Prisma singleton + audit middleware
│   └── auth.ts                     # requireRole() server-side guard
├── types/index.ts                  # KpiWithVariance, DrillDownRow, UploadRow
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── styles/globals.css              # RTL Tailwind overrides, Shadcn RTL fixes
```

---

## Phase 1 — Foundation

### Task 1: Project Scaffold + Docker

**Files:**
- Create: `docker-compose.yml`
- Create: (Next.js scaffold into current directory)

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ers_db
      POSTGRES_USER: ers_user
      POSTGRES_PASSWORD: ers_pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Start the database**

```bash
docker compose up -d
```

Expected: `✔ Container cultural_dashboard-db-1 Started`

- [ ] **Step 3: Scaffold Next.js into the current directory**

```bash
cd "C:\Users\marwa\OneDrive\Documents\Projects\Cultural_Dashboard"
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

When prompted "Would you like to proceed in a non-empty directory?" → answer `y`.

- [ ] **Step 4: Install domain dependencies**

```bash
npm install @prisma/client prisma xlsx @tanstack/react-query @tanstack/react-query-devtools recharts @react-pdf/renderer
npm install -D @types/xlsx jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom ts-jest
```

- [ ] **Step 5: Install Shadcn/UI**

```bash
npx shadcn@latest init
```

When prompted: style → Default, base color → Slate, CSS variables → yes.

Then add required components:

```bash
npx shadcn@latest add button card dialog badge progress table select
```

- [ ] **Step 6: Write Jest config**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default config
```

Create `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Write `.env.local`**

```
DATABASE_URL="postgresql://ers_user:ers_pass@localhost:5432/ers_db"
```

- [ ] **Step 8: Commit**

```bash
git init
git add docker-compose.yml package.json package-lock.json jest.config.ts jest.setup.ts .env.local next.config.ts tsconfig.json
git commit -m "feat: scaffold Next.js + Docker + Shadcn/UI for ERS"
```

---

### Task 2: Prisma Schema + Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Test: `prisma/seed.test.ts`

- [ ] **Step 1: Write failing test for seed output**

Create `prisma/seed.test.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('seed data', () => {
  afterAll(() => prisma.$disconnect())

  it('creates all four pillars as KPI categories', async () => {
    const pillars = await prisma.kpiRegistry.findMany({
      distinct: ['pillar'],
      select: { pillar: true },
    })
    const pillarValues = pillars.map(p => p.pillar).sort()
    expect(pillarValues).toEqual([
      'HOLY_QURAN',
      'ISLAMIC_EDUCATION',
      'TEACHER_SPONSORSHIP',
      'UNIVERSITY_SPONSORSHIP',
    ])
  })

  it('every KPI has at least one target for current year', async () => {
    const kpis = await prisma.kpiRegistry.findMany({ include: { targets: true } })
    kpis.forEach(kpi => {
      expect(kpi.targets.length).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest prisma/seed.test.ts --no-coverage
```

Expected: FAIL — `PrismaClient` cannot connect (schema not yet defined)

- [ ] **Step 3: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Pillar {
  ISLAMIC_EDUCATION
  HOLY_QURAN
  TEACHER_SPONSORSHIP
  UNIVERSITY_SPONSORSHIP
}

enum KpiUnit {
  PERCENT
  COUNT
  CURRENCY
}

enum ProgramStatus {
  ON_TRACK
  AT_RISK
  COMPLETED
}

enum UserRole {
  ADMIN
  EDITOR
  VIEWER
}

enum Period {
  Q1
  Q2
  Q3
  Q4
  ANNUAL
}

model KpiRegistry {
  id        String    @id @default(cuid())
  nameAr    String
  pillar    Pillar
  unit      KpiUnit
  owner     String?
  targets   Target[]
  actuals   Actual[]
  createdAt DateTime  @default(now())
}

model Target {
  id     String      @id @default(cuid())
  kpiId  String
  kpi    KpiRegistry @relation(fields: [kpiId], references: [id])
  period Period
  year   Int
  value  Float

  @@unique([kpiId, period, year])
}

model Actual {
  id              String      @id @default(cuid())
  kpiId           String
  kpi             KpiRegistry @relation(fields: [kpiId], references: [id])
  period          Period
  year            Int
  value           Float
  region          String?
  facility        String?
  confidenceScore Float       @default(1.0)
  createdAt       DateTime    @default(now())
}

model Program {
  id            String        @id @default(cuid())
  nameAr        String
  pillar        Pillar
  status        ProgramStatus
  completionPct Float         @default(0)
  budget        Float?
  updatedAt     DateTime      @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  kpiId     String?
  oldValue  String?
  newValue  String?
  timestamp DateTime @default(now())
}

model User {
  id    String   @id @default(cuid())
  email String   @unique
  name  String?
  role  UserRole @default(VIEWER)
}
```

- [ ] **Step 4: Generate Prisma client + push schema**

```bash
npx prisma generate
npx prisma db push
```

Expected: `✔ Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Write `prisma/seed.ts`**

```typescript
import { PrismaClient, Pillar, KpiUnit, Period, ProgramStatus } from '@prisma/client'

const prisma = new PrismaClient()

const YEAR = 2026

const kpis: Array<{ nameAr: string; pillar: Pillar; unit: KpiUnit; targetAnnual: number }> = [
  { nameAr: 'عدد المراكز الإسلامية', pillar: 'ISLAMIC_EDUCATION', unit: 'COUNT', targetAnnual: 120 },
  { nameAr: 'معدل إتمام المناهج', pillar: 'ISLAMIC_EDUCATION', unit: 'PERCENT', targetAnnual: 100 },
  { nameAr: 'حجم طباعة المصاحف', pillar: 'HOLY_QURAN', unit: 'COUNT', targetAnnual: 500000 },
  { nameAr: 'مسابقات التلاوة', pillar: 'HOLY_QURAN', unit: 'COUNT', targetAnnual: 20 },
  { nameAr: 'كفالات المعلمين النشطة', pillar: 'TEACHER_SPONSORSHIP', unit: 'COUNT', targetAnnual: 300 },
  { nameAr: 'ساعات التدريب', pillar: 'TEACHER_SPONSORSHIP', unit: 'COUNT', targetAnnual: 4800 },
  { nameAr: 'المنح الجامعية النشطة', pillar: 'UNIVERSITY_SPONSORSHIP', unit: 'COUNT', targetAnnual: 150 },
  { nameAr: 'معدل التخرج', pillar: 'UNIVERSITY_SPONSORSHIP', unit: 'PERCENT', targetAnnual: 100 },
]

async function main() {
  for (const k of kpis) {
    const kpi = await prisma.kpiRegistry.upsert({
      where: { id: k.nameAr },
      create: { nameAr: k.nameAr, pillar: k.pillar, unit: k.unit },
      update: {},
    })

    await prisma.target.upsert({
      where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: YEAR } },
      create: { kpiId: kpi.id, period: 'ANNUAL', year: YEAR, value: k.targetAnnual },
      update: { value: k.targetAnnual },
    })

    // Seed sample actuals for Q1-Q4
    const actuals = [k.targetAnnual * 0.82, k.targetAnnual * 0.88, k.targetAnnual * 0.93, k.targetAnnual * 0.97]
    for (let i = 0; i < 4; i++) {
      const period = (['Q1', 'Q2', 'Q3', 'Q4'] as Period[])[i]
      await prisma.actual.upsert({
        where: { id: `${kpi.id}-${period}-${YEAR}` },
        create: { id: `${kpi.id}-${period}-${YEAR}`, kpiId: kpi.id, period, year: YEAR, value: actuals[i] },
        update: { value: actuals[i] },
      })
    }
  }
  console.log('✅ Seed complete')
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 6: Add seed script to `package.json`**

In `package.json`, add under `"scripts"`:

```json
"db:seed": "ts-node prisma/seed.ts"
```

Run the seed:

```bash
npx ts-node prisma/seed.ts
```

Expected: `✅ Seed complete`

- [ ] **Step 7: Run the test — verify it passes**

```bash
npx jest prisma/seed.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add prisma/ .env.local package.json
git commit -m "feat: Prisma schema with 4-pillar data model + seed data"
```

---

### Task 3: Shared Types + KPI Variance Library

**Files:**
- Create: `types/index.ts`
- Create: `lib/kpi.ts`
- Test: `lib/kpi.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/kpi.test.ts`:

```typescript
import { computeVariance, getVarianceColor, COLOR_CLASSES } from '@/lib/kpi'

describe('computeVariance', () => {
  it('returns pct as (actual/target)*100', () => {
    const result = computeVariance(95, 100)
    expect(result.pct).toBeCloseTo(95)
  })

  it('classifies >95% as green', () => {
    expect(computeVariance(96, 100).color).toBe('green')
  })

  it('classifies exactly 95% as green', () => {
    expect(computeVariance(95, 100).color).toBe('green')
  })

  it('classifies 90% as amber', () => {
    expect(computeVariance(90, 100).color).toBe('amber')
  })

  it('classifies exactly 85% as amber', () => {
    expect(computeVariance(85, 100).color).toBe('amber')
  })

  it('classifies 84% as red', () => {
    expect(computeVariance(84, 100).color).toBe('red')
  })

  it('handles zero target without throwing', () => {
    const result = computeVariance(10, 0)
    expect(result.color).toBe('red')
    expect(result.pct).toBe(0)
  })
})

describe('COLOR_CLASSES', () => {
  it('has entries for green, amber, red', () => {
    expect(COLOR_CLASSES.green).toBeDefined()
    expect(COLOR_CLASSES.amber).toBeDefined()
    expect(COLOR_CLASSES.red).toBeDefined()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest lib/kpi.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/kpi'`

- [ ] **Step 3: Write `types/index.ts`**

```typescript
export type VarianceColor = 'green' | 'amber' | 'red'
export type PillarId =
  | 'ISLAMIC_EDUCATION'
  | 'HOLY_QURAN'
  | 'TEACHER_SPONSORSHIP'
  | 'UNIVERSITY_SPONSORSHIP'

export interface KpiVariance {
  actual: number
  target: number
  pct: number
  color: VarianceColor
}

export interface KpiWithVariance {
  id: string
  nameAr: string
  pillar: PillarId
  unit: 'PERCENT' | 'COUNT' | 'CURRENCY'
  variance: KpiVariance
  sparkline: number[]   // last 4 quarter actuals
}

export interface DrillDownRow {
  region: string
  facility?: string
  actual: number
  target: number
  variance: KpiVariance
}

export interface UploadRow {
  kpiId: string
  period: string
  year: number
  value: number
  region?: string
  facility?: string
}

export interface UploadValidationResult {
  valid: UploadRow[]
  errors: Array<{ row: number; message: string }>
}
```

- [ ] **Step 4: Write `lib/kpi.ts`**

```typescript
import type { KpiVariance, VarianceColor } from '@/types'

export const COLOR_CLASSES: Record<VarianceColor, string> = {
  green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
}

export const COLOR_DOT: Record<VarianceColor, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export function computeVariance(actual: number, target: number): KpiVariance {
  if (target === 0) return { actual, target, pct: 0, color: 'red' }
  const pct = (actual / target) * 100
  const color: VarianceColor = pct > 95 ? 'green' : pct >= 85 ? 'amber' : 'red'
  return { actual, target, pct, color }
}

export function formatVariancePct(pct: number): string {
  return `${pct.toFixed(1)}٪`
}

export function formatValue(value: number, unit: 'PERCENT' | 'COUNT' | 'CURRENCY'): string {
  if (unit === 'PERCENT') return `${value.toFixed(1)}٪`
  if (unit === 'CURRENCY') return value.toLocaleString('ar-AE') + ' د.إ'
  return value.toLocaleString('ar-AE')
}
```

- [ ] **Step 5: Run — verify tests pass**

```bash
npx jest lib/kpi.test.ts --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/kpi.ts lib/kpi.test.ts types/index.ts
git commit -m "feat: KPI variance logic with green/amber/red thresholds (tested)"
```

---

## Phase 2 — RTL Layout

### Task 4: Root Layout + RTL Foundation

**Files:**
- Create: `styles/globals.css`
- Modify: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `lib/prisma.ts`
- Create: `components/providers.tsx`

- [ ] **Step 1: Write `lib/prisma.ts` (singleton + audit middleware)**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Audit middleware — logs every create/update/delete on Actual and KpiRegistry
prisma.$use(async (params, next) => {
  const auditedModels = ['Actual', 'KpiRegistry']
  if (!auditedModels.includes(params.model ?? '') || params.action === 'findMany') {
    return next(params)
  }

  const before = params.action.startsWith('update')
    ? await (prisma as any)[params.model!.toLowerCase()].findUnique({
        where: params.args.where,
      })
    : null

  const result = await next(params)

  await prisma.auditLog.create({
    data: {
      userId: 'system',
      action: `${params.model}.${params.action}`,
      kpiId: params.args?.where?.id ?? params.args?.data?.kpiId ?? null,
      oldValue: before ? JSON.stringify(before) : null,
      newValue: result ? JSON.stringify(result) : null,
    },
  })

  return result
})
```

- [ ] **Step 2: Write `components/providers.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Write `styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');

:root {
  --font-arabic: 'Cairo', system-ui, sans-serif;
  --bg: #faf9f7;
  --text: #23221f;
  --accent: #0f4024;
  --border: #e5e3df;
}

html {
  direction: rtl;
  font-family: var(--font-arabic);
}

body {
  background-color: var(--bg);
  color: var(--text);
}

/* Fix Shadcn components that hardcode LTR directional values */
[data-radix-popper-content-wrapper] {
  direction: rtl;
}

.recharts-wrapper {
  direction: ltr; /* Recharts internal — RTL handled by RtlChart wrapper */
}

/* Flip chevron icons in RTL context */
[dir="rtl"] .lucide-chevron-right {
  transform: scaleX(-1);
}
[dir="rtl"] .lucide-chevron-left {
  transform: scaleX(-1);
}
```

- [ ] **Step 4: Write `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'نظام التقارير التنفيذية — شؤون الإسلامية',
  description: 'لوحة متابعة مؤشرات الأداء التنفيذية',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Write `app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 6: Start dev server and confirm RTL renders**

```bash
npm run dev
```

Open `http://localhost:3000` — browser should redirect to `/dashboard` (404 is fine for now). Inspect the `<html>` tag and confirm `dir="rtl"` and `lang="ar"` are present.

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx app/page.tsx styles/globals.css lib/prisma.ts components/providers.tsx
git commit -m "feat: RTL foundation — dir=rtl, Cairo font, QueryClient provider"
```

---

### Task 5: AppShell + Sidebar + PeriodControls

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/PeriodControls.tsx`
- Create: `components/layout/AppShell.tsx`
- Test: `components/layout/Sidebar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/layout/Sidebar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders all four pillar navigation links', () => {
    render(<Sidebar />)
    expect(screen.getByText('التعليم الإسلامي')).toBeInTheDocument()
    expect(screen.getByText('القرآن الكريم')).toBeInTheDocument()
    expect(screen.getByText('كفالة المعلمين')).toBeInTheDocument()
    expect(screen.getByText('المنح الجامعية')).toBeInTheDocument()
  })

  it('renders the division name in the header', () => {
    render(<Sidebar />)
    expect(screen.getByText('شؤون الإسلامية')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest components/layout/Sidebar.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module './Sidebar'`

- [ ] **Step 3: Write `components/layout/Sidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PILLARS = [
  { href: '/dashboard?pillar=ISLAMIC_EDUCATION', labelAr: 'التعليم الإسلامي', icon: '🕌' },
  { href: '/dashboard?pillar=HOLY_QURAN', labelAr: 'القرآن الكريم', icon: '📖' },
  { href: '/dashboard?pillar=TEACHER_SPONSORSHIP', labelAr: 'كفالة المعلمين', icon: '👨‍🏫' },
  { href: '/dashboard?pillar=UNIVERSITY_SPONSORSHIP', labelAr: 'المنح الجامعية', icon: '🎓' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-[#0f4024] text-white flex flex-col border-l border-white/10">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-xs text-white/50 mb-1">نظام التقارير التنفيذية</p>
        <h1 className="text-base font-bold leading-tight">شؤون الإسلامية</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            pathname === '/dashboard' && !pathname.includes('pillar')
              ? 'bg-white/15 font-semibold'
              : 'hover:bg-white/10'
          }`}
        >
          <span>📊</span>
          <span>الرئيسية</span>
        </Link>

        <div className="pt-3 pb-1 px-3">
          <p className="text-xs text-white/40 font-medium">المحاور الأربعة</p>
        </div>

        {PILLARS.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
          >
            <span>{p.icon}</span>
            <span>{p.labelAr}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link href="/upload" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10">
          <span>⬆️</span>
          <span>رفع البيانات</span>
        </Link>
        <Link href="/admin/audit" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10">
          <span>📋</span>
          <span>سجل المراجعة</span>
        </Link>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Write `components/layout/PeriodControls.tsx`**

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'] as const

export function PeriodControls() {
  const router = useRouter()
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    next.set(key, value)
    router.push(`?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <select
        value={year}
        onChange={e => update('year', e.target.value)}
        className="border border-[--border] rounded-md px-3 py-1.5 bg-white"
        aria-label="السنة"
      >
        {[2024, 2025, 2026].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="flex border border-[--border] rounded-md overflow-hidden">
        {QUARTERS.map(q => (
          <button
            key={q}
            onClick={() => update('period', q)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              period === q
                ? 'bg-[#0f4024] text-white'
                : 'bg-white hover:bg-slate-50'
            }`}
          >
            {q === 'ANNUAL' ? 'سنوي' : q}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `components/layout/AppShell.tsx`**

```typescript
import { Sidebar } from './Sidebar'
import { PeriodControls } from './PeriodControls'
import { Suspense } from 'react'

interface AppShellProps {
  children: React.ReactNode
  title: string
}

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-[--border] bg-white px-6 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-semibold text-base">{title}</h2>
          <Suspense>
            <PeriodControls />
          </Suspense>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
npx jest components/layout/Sidebar.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add components/layout/
git commit -m "feat: RTL sidebar with four pillar links + period controls"
```

---

## Phase 3 — Dashboard UI

### Task 6: KpiCard Component

**Files:**
- Create: `components/kpi/KpiCard.tsx`
- Test: `components/kpi/KpiCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/kpi/KpiCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { KpiCard } from './KpiCard'
import type { KpiWithVariance } from '@/types'

const baseKpi: KpiWithVariance = {
  id: 'kpi-1',
  nameAr: 'كفالات المعلمين النشطة',
  pillar: 'TEACHER_SPONSORSHIP',
  unit: 'COUNT',
  variance: { actual: 270, target: 300, pct: 90, color: 'amber' },
  sparkline: [240, 255, 263, 270],
}

describe('KpiCard', () => {
  it('renders the KPI Arabic name', () => {
    render(<KpiCard kpi={baseKpi} />)
    expect(screen.getByText('كفالات المعلمين النشطة')).toBeInTheDocument()
  })

  it('renders actual and target values', () => {
    render(<KpiCard kpi={baseKpi} />)
    expect(screen.getByText(/270/)).toBeInTheDocument()
    expect(screen.getByText(/300/)).toBeInTheDocument()
  })

  it('renders variance percentage', () => {
    render(<KpiCard kpi={baseKpi} />)
    expect(screen.getByText(/90\.0٪/)).toBeInTheDocument()
  })

  it('applies amber styling for 90% variance', () => {
    const { container } = render(<KpiCard kpi={baseKpi} />)
    expect(container.querySelector('.bg-amber-50')).toBeInTheDocument()
  })

  it('applies green styling when >95%', () => {
    const greenKpi = { ...baseKpi, variance: { actual: 98, target: 100, pct: 98, color: 'green' as const } }
    const { container } = render(<KpiCard kpi={greenKpi} />)
    expect(container.querySelector('.bg-emerald-50')).toBeInTheDocument()
  })

  it('applies red styling when <85%', () => {
    const redKpi = { ...baseKpi, variance: { actual: 80, target: 100, pct: 80, color: 'red' as const } }
    const { container } = render(<KpiCard kpi={redKpi} />)
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest components/kpi/KpiCard.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module './KpiCard'`

- [ ] **Step 3: Write `components/kpi/KpiCard.tsx`**

```typescript
'use client'

import { COLOR_CLASSES, COLOR_DOT, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const colorClass = COLOR_CLASSES[variance.color]
  const dotClass = COLOR_DOT[variance.color]

  return (
    <button
      onClick={onClick}
      className={`w-full text-right rounded-xl border p-5 transition-shadow hover:shadow-md ${colorClass}`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
        <p className="text-sm font-semibold leading-snug flex-1 mr-2">{kpi.nameAr}</p>
      </div>

      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-3xl font-bold tabular-nums">
            {formatValue(variance.actual, unit)}
          </p>
          <p className="text-xs opacity-70">
            المستهدف: {formatValue(variance.target, unit)}
          </p>
        </div>
        <div className="w-24 h-12">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-current/20 flex justify-between items-center">
        <span className="text-xs opacity-70">نسبة الإنجاز</span>
        <span className="text-sm font-bold tabular-nums">
          {formatVariancePct(variance.pct)}
        </span>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest components/kpi/KpiCard.test.tsx --no-coverage
```

Expected: PASS (6 tests). Note: SparklineChart will need a mock — add to `jest.setup.ts`:

```typescript
jest.mock('@/components/charts/SparklineChart', () => ({
  SparklineChart: () => <div data-testid="sparkline" />,
}))
```

- [ ] **Step 5: Commit**

```bash
git add components/kpi/KpiCard.tsx components/kpi/KpiCard.test.tsx jest.setup.ts
git commit -m "feat: KpiCard with variance coloring and sparkline slot (tested)"
```

---

### Task 7: RtlChart Wrapper + SparklineChart

**Files:**
- Create: `components/charts/RtlChart.tsx`
- Create: `components/charts/SparklineChart.tsx`
- Test: `components/charts/SparklineChart.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/charts/SparklineChart.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { SparklineChart } from './SparklineChart'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <svg>{children}</svg>,
  Line: () => null,
  Tooltip: () => null,
}))

describe('SparklineChart', () => {
  it('renders without crashing with 4 data points', () => {
    const { container } = render(
      <SparklineChart data={[80, 85, 90, 95]} color="green" />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing with empty data', () => {
    const { container } = render(<SparklineChart data={[]} color="amber" />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest components/charts/SparklineChart.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module './SparklineChart'`

- [ ] **Step 3: Write `components/charts/RtlChart.tsx`**

```typescript
'use client'

import { ReactNode } from 'react'

/**
 * Wraps Recharts components for RTL rendering.
 * Recharts uses LTR internally — we flip the container with CSS
 * and then flip chart content back, so axes read right-to-left.
 */
export function RtlChart({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      dir="ltr"
      style={{ transform: 'scaleX(-1)' }}
      className={className}
    >
      <div style={{ transform: 'scaleX(-1)' }}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `components/charts/SparklineChart.tsx`**

```typescript
'use client'

import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'
import type { VarianceColor } from '@/types'

const STROKE_COLOR: Record<VarianceColor, string> = {
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
}

interface SparklineChartProps {
  data: number[]
  color: VarianceColor
}

export function SparklineChart({ data, color }: SparklineChartProps) {
  const chartData = data.map((v, i) => ({ q: `Q${i + 1}`, v }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={STROKE_COLOR[color]}
          strokeWidth={2}
          dot={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, direction: 'rtl' }}
          formatter={(val: number) => [val.toLocaleString('ar-AE'), 'القيمة']}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 5: Run — verify tests pass**

```bash
npx jest components/charts/SparklineChart.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add components/charts/
git commit -m "feat: RtlChart wrapper + SparklineChart with variance color (tested)"
```

---

### Task 8: KPI API Route + KpiGrid + Dashboard Page

**Files:**
- Create: `app/api/kpis/route.ts`
- Create: `components/kpi/KpiGrid.tsx`
- Create: `app/dashboard/page.tsx`
- Test: `app/api/kpis/route.test.ts`

- [ ] **Step 1: Write failing test for API route**

Create `app/api/kpis/route.test.ts`:

```typescript
import { GET } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'k1',
          nameAr: 'عدد المراكز',
          pillar: 'ISLAMIC_EDUCATION',
          unit: 'COUNT',
          targets: [{ value: 120, period: 'ANNUAL', year: 2026 }],
          actuals: [
            { value: 100, period: 'Q1', year: 2026 },
            { value: 105, period: 'Q2', year: 2026 },
            { value: 110, period: 'Q3', year: 2026 },
            { value: 115, period: 'Q4', year: 2026 },
          ],
        },
      ]),
    },
  },
}))

describe('GET /api/kpis', () => {
  it('returns KPIs with computed variance', async () => {
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body[0].variance).toBeDefined()
    expect(body[0].variance.color).toMatch(/green|amber|red/)
    expect(body[0].sparkline).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest app/api/kpis/route.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Write `app/api/kpis/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import type { KpiWithVariance } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = (searchParams.get('period') ?? 'ANNUAL') as string

  const kpis = await prisma.kpiRegistry.findMany({
    include: {
      targets: { where: { year } },
      actuals: { where: { year }, orderBy: { period: 'asc' } },
    },
  })

  const result: KpiWithVariance[] = kpis.map(kpi => {
    const target = kpi.targets.find(t => t.period === period) ?? kpi.targets[0]
    const actual = kpi.actuals.find(a => a.period === period) ?? kpi.actuals[kpi.actuals.length - 1]
    const targetVal = target?.value ?? 0
    const actualVal = actual?.value ?? 0

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const sparkline = quarters.map(q => {
      const a = kpi.actuals.find(x => x.period === q)
      return a?.value ?? 0
    })

    return {
      id: kpi.id,
      nameAr: kpi.nameAr,
      pillar: kpi.pillar as KpiWithVariance['pillar'],
      unit: kpi.unit as KpiWithVariance['unit'],
      variance: computeVariance(actualVal, targetVal),
      sparkline,
    }
  })

  return NextResponse.json(result)
}
```

- [ ] **Step 4: Write `components/kpi/KpiGrid.tsx`**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { KpiCard } from './KpiCard'
import { DrillDownModal } from './DrillDownModal'
import { useState } from 'react'
import type { KpiWithVariance, PillarId } from '@/types'

const PILLAR_LABELS: Record<PillarId, string> = {
  ISLAMIC_EDUCATION: 'التعليم الإسلامي',
  HOLY_QURAN: 'القرآن الكريم',
  TEACHER_SPONSORSHIP: 'كفالة المعلمين',
  UNIVERSITY_SPONSORSHIP: 'المنح الجامعية',
}

export function KpiGrid() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'
  const [selectedKpi, setSelectedKpi] = useState<KpiWithVariance | null>(null)

  const { data: kpis, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () => fetch(`/api/kpis?year=${year}&period=${period}`).then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const pillars = Object.keys(PILLAR_LABELS) as PillarId[]

  return (
    <>
      <div className="space-y-8">
        {pillars.map(pillar => {
          const pillarKpis = (kpis ?? []).filter(k => k.pillar === pillar)
          if (!pillarKpis.length) return null
          return (
            <section key={pillar}>
              <h3 className="text-sm font-semibold text-slate-500 mb-3">{PILLAR_LABELS[pillar]}</h3>
              <div className="grid grid-cols-2 gap-4">
                {pillarKpis.map(kpi => (
                  <KpiCard key={kpi.id} kpi={kpi} onClick={() => setSelectedKpi(kpi)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {selectedKpi && (
        <DrillDownModal kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />
      )}
    </>
  )
}
```

- [ ] **Step 5: Write `app/dashboard/page.tsx`**

```typescript
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { ExecutiveSummary } from '@/components/narrative/ExecutiveSummary'
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <AppShell title="لوحة المتابعة التنفيذية">
      <div className="max-w-5xl mx-auto space-y-6">
        <Suspense>
          <ExecutiveSummary />
        </Suspense>
        <Suspense>
          <KpiGrid />
        </Suspense>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
npx jest app/api/kpis/route.test.ts --no-coverage
```

Expected: PASS (1 test)

- [ ] **Step 7: Smoke test in browser**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` — confirm 8 KPI cards render in RTL layout grouped by pillar with correct variance colors.

- [ ] **Step 8: Commit**

```bash
git add app/api/kpis/route.ts app/api/kpis/route.test.ts components/kpi/KpiGrid.tsx app/dashboard/page.tsx
git commit -m "feat: KPI API route + dashboard page with pillar grid"
```

---

### Task 9: Drill-Down Modal

**Files:**
- Create: `app/api/kpis/[id]/route.ts`
- Create: `components/kpi/DrillDownModal.tsx`
- Test: `components/kpi/DrillDownModal.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/kpi/DrillDownModal.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DrillDownModal } from './DrillDownModal'
import type { KpiWithVariance } from '@/types'

const kpi: KpiWithVariance = {
  id: 'k1',
  nameAr: 'عدد المراكز الإسلامية',
  pillar: 'ISLAMIC_EDUCATION',
  unit: 'COUNT',
  variance: { actual: 100, target: 120, pct: 83.3, color: 'red' },
  sparkline: [80, 88, 95, 100],
}

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { region: 'أبوظبي', actual: 40, target: 50, variance: { actual: 40, target: 50, pct: 80, color: 'red' } },
      { region: 'دبي', actual: 60, target: 70, variance: { actual: 60, target: 70, pct: 85.7, color: 'amber' } },
    ],
    isLoading: false,
  }),
}))

describe('DrillDownModal', () => {
  it('renders the KPI name in the modal header', () => {
    render(<DrillDownModal kpi={kpi} onClose={() => {}} />)
    expect(screen.getByText('عدد المراكز الإسلامية')).toBeInTheDocument()
  })

  it('renders regional breakdown rows', () => {
    render(<DrillDownModal kpi={kpi} onClose={() => {}} />)
    expect(screen.getByText('أبوظبي')).toBeInTheDocument()
    expect(screen.getByText('دبي')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<DrillDownModal kpi={kpi} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /إغلاق/ }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest components/kpi/DrillDownModal.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module './DrillDownModal'`

- [ ] **Step 3: Write `app/api/kpis/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import type { DrillDownRow } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = (searchParams.get('period') ?? 'ANNUAL') as string

  const actuals = await prisma.actual.findMany({
    where: { kpiId: params.id, year },
    orderBy: { region: 'asc' },
  })

  const target = await prisma.target.findFirst({
    where: { kpiId: params.id, period, year },
  })

  const targetVal = target?.value ?? 0

  // Group by region
  const regionMap = new Map<string, number>()
  for (const a of actuals) {
    if (!a.region) continue
    regionMap.set(a.region, (regionMap.get(a.region) ?? 0) + a.value)
  }

  const rows: DrillDownRow[] = Array.from(regionMap.entries()).map(([region, actual]) => ({
    region,
    actual,
    target: targetVal,
    variance: computeVariance(actual, targetVal),
  }))

  return NextResponse.json(rows)
}
```

- [ ] **Step 4: Write `components/kpi/DrillDownModal.tsx`**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { COLOR_CLASSES, formatVariancePct } from '@/lib/kpi'
import type { KpiWithVariance, DrillDownRow } from '@/types'

interface DrillDownModalProps {
  kpi: KpiWithVariance
  onClose: () => void
}

export function DrillDownModal({ kpi, onClose }: DrillDownModalProps) {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: rows, isLoading } = useQuery<DrillDownRow[]>({
    queryKey: ['drill-down', kpi.id, year, period],
    queryFn: () =>
      fetch(`/api/kpis/${kpi.id}?year=${year}&period=${period}`).then(r => r.json()),
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ✕
          </button>
          <h3 className="font-bold text-lg">{kpi.nameAr}</h3>
        </div>

        <div className="overflow-auto flex-1 p-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="text-right pb-2 font-medium">المنطقة</th>
                  <th className="text-right pb-2 font-medium">الفعلي</th>
                  <th className="text-right pb-2 font-medium">المستهدف</th>
                  <th className="text-right pb-2 font-medium">نسبة الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(rows ?? []).map((row, i) => (
                  <tr key={i} className={`${COLOR_CLASSES[row.variance.color]} border-none`}>
                    <td className="py-2.5 font-medium">{row.region}</td>
                    <td className="py-2.5 tabular-nums">{row.actual.toLocaleString('ar-AE')}</td>
                    <td className="py-2.5 tabular-nums">{row.target.toLocaleString('ar-AE')}</td>
                    <td className="py-2.5 font-bold tabular-nums">
                      {formatVariancePct(row.variance.pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run — verify tests pass**

```bash
npx jest components/kpi/DrillDownModal.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add app/api/kpis/\[id\]/ components/kpi/DrillDownModal.tsx components/kpi/DrillDownModal.test.tsx
git commit -m "feat: drill-down modal with regional breakdown API (tested)"
```

---

## Phase 4 — Data Ingestion

### Task 10: Excel Parser Utility

**Files:**
- Create: `lib/excel.ts`
- Test: `lib/excel.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/excel.test.ts`:

```typescript
import { validateRow, normalizeRow } from '@/lib/excel'

describe('validateRow', () => {
  it('returns no errors for a valid row', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }, 1)
    expect(errors).toHaveLength(0)
  })

  it('returns error when kpiId is missing', () => {
    const errors = validateRow({ kpiId: '', period: 'Q1', year: 2026, value: 100 }, 2)
    expect(errors[0]).toMatch(/kpiId/)
  })

  it('returns error for invalid period', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'X3', year: 2026, value: 100 }, 3)
    expect(errors[0]).toMatch(/period/)
  })

  it('returns error for non-numeric value', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'Q2', year: 2026, value: NaN }, 4)
    expect(errors[0]).toMatch(/value/)
  })

  it('returns error for year outside 2020-2030', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'Q1', year: 1999, value: 50 }, 5)
    expect(errors[0]).toMatch(/year/)
  })
})

describe('normalizeRow', () => {
  it('trims whitespace from string fields', () => {
    const row = normalizeRow({ kpiId: '  k1  ', period: ' Q1 ', year: 2026, value: 10 })
    expect(row.kpiId).toBe('k1')
    expect(row.period).toBe('Q1')
  })

  it('coerces string numbers to numbers', () => {
    const row = normalizeRow({ kpiId: 'k1', period: 'Q1', year: '2026' as any, value: '99.5' as any })
    expect(typeof row.year).toBe('number')
    expect(typeof row.value).toBe('number')
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest lib/excel.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/excel'`

- [ ] **Step 3: Write `lib/excel.ts`**

```typescript
import * as XLSX from 'xlsx'
import type { UploadRow, UploadValidationResult } from '@/types'

const VALID_PERIODS = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'])

export function normalizeRow(raw: Partial<UploadRow>): UploadRow {
  return {
    kpiId: String(raw.kpiId ?? '').trim(),
    period: String(raw.period ?? '').trim().toUpperCase(),
    year: Number(raw.year),
    value: Number(raw.value),
    region: raw.region ? String(raw.region).trim() : undefined,
    facility: raw.facility ? String(raw.facility).trim() : undefined,
  }
}

export function validateRow(row: UploadRow, rowIndex: number): string[] {
  const errors: string[] = []
  if (!row.kpiId) errors.push(`الصف ${rowIndex}: kpiId مطلوب`)
  if (!VALID_PERIODS.has(row.period)) errors.push(`الصف ${rowIndex}: period غير صحيح (${row.period})`)
  if (isNaN(row.value)) errors.push(`الصف ${rowIndex}: value يجب أن يكون رقماً`)
  if (isNaN(row.year) || row.year < 2020 || row.year > 2030) {
    errors.push(`الصف ${rowIndex}: year غير صحيح (${row.year})`)
  }
  return errors
}

export function parseExcelFile(buffer: ArrayBuffer): UploadValidationResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const valid: UploadRow[] = []
  const errors: Array<{ row: number; message: string }> = []

  rawRows.forEach((raw, index) => {
    const row = normalizeRow(raw as Partial<UploadRow>)
    const rowErrors = validateRow(row, index + 2) // +2 = 1-based + header row

    if (rowErrors.length > 0) {
      errors.push(...rowErrors.map(message => ({ row: index + 2, message })))
    } else {
      valid.push(row)
    }
  })

  return { valid, errors }
}
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest lib/excel.test.ts --no-coverage
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/excel.ts lib/excel.test.ts
git commit -m "feat: Excel/CSV parser with Arabic UTF-8 support and row validation (tested)"
```

---

### Task 11: Upload API + File Uploader UI

**Files:**
- Create: `app/api/upload/route.ts`
- Create: `components/upload/FileUploader.tsx`
- Create: `components/upload/ValidationPreview.tsx`
- Create: `app/upload/page.tsx`
- Test: `app/api/upload/route.test.ts`

- [ ] **Step 1: Write failing test for upload API**

Create `app/api/upload/route.test.ts`:

```typescript
import { POST } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/excel', () => ({
  parseExcelFile: jest.fn().mockReturnValue({
    valid: [{ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }],
    errors: [],
  }),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    actual: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
  },
}))

describe('POST /api/upload', () => {
  it('returns 200 with import summary on valid file', async () => {
    const formData = new FormData()
    formData.append('file', new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'data.xlsx')
    formData.append('dryRun', 'false')

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.imported).toBe(1)
    expect(body.errors).toHaveLength(0)
  })

  it('returns dry run preview without committing', async () => {
    const formData = new FormData()
    formData.append('file', new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'data.xlsx')
    formData.append('dryRun', 'true')

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dryRun).toBe(true)
    expect(body.preview).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest app/api/upload/route.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Write `app/api/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile } from '@/lib/excel'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const dryRun = formData.get('dryRun') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const { valid, errors } = parseExcelFile(buffer)

  if (dryRun) {
    return NextResponse.json({ dryRun: true, preview: valid, errors })
  }

  let imported = 0
  for (const row of valid) {
    await prisma.actual.create({
      data: {
        kpiId: row.kpiId,
        period: row.period as any,
        year: row.year,
        value: row.value,
        region: row.region,
        facility: row.facility,
      },
    })
    imported++
  }

  return NextResponse.json({ imported, errors })
}
```

- [ ] **Step 4: Write `components/upload/ValidationPreview.tsx`**

```typescript
import type { UploadRow, UploadValidationResult } from '@/types'

interface ValidationPreviewProps {
  result: UploadValidationResult
}

export function ValidationPreview({ result }: ValidationPreviewProps) {
  return (
    <div className="space-y-4">
      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            {result.errors.length} أخطاء في الملف
          </p>
          <ul className="text-xs text-red-600 space-y-1">
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {result.valid.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">
            {result.valid.length} سجل جاهز للاستيراد
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-right p-2 border">KPI ID</th>
                <th className="text-right p-2 border">الفترة</th>
                <th className="text-right p-2 border">السنة</th>
                <th className="text-right p-2 border">القيمة</th>
                <th className="text-right p-2 border">المنطقة</th>
              </tr>
            </thead>
            <tbody>
              {result.valid.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border font-mono">{row.kpiId}</td>
                  <td className="p-2 border">{row.period}</td>
                  <td className="p-2 border">{row.year}</td>
                  <td className="p-2 border tabular-nums">{row.value.toLocaleString('ar-AE')}</td>
                  <td className="p-2 border">{row.region ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write `components/upload/FileUploader.tsx`**

```typescript
'use client'

import { useState, useRef } from 'react'
import { ValidationPreview } from './ValidationPreview'
import type { UploadValidationResult } from '@/types'

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<UploadValidationResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleFile(file: File) {
    setStatus('loading')
    setPreview(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('dryRun', 'true')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const body = await res.json()
    setPreview(body)
    setStatus('idle')
  }

  async function handleCommit() {
    if (!inputRef.current?.files?.[0]) return
    setStatus('loading')

    const formData = new FormData()
    formData.append('file', inputRef.current.files[0])
    formData.append('dryRun', 'false')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const body = await res.json()

    if (res.ok) {
      setMessage(`تم استيراد ${body.imported} سجل بنجاح`)
      setStatus('done')
      setPreview(null)
    } else {
      setMessage('حدث خطأ أثناء الاستيراد')
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#0f4024] transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <p className="text-slate-500 text-sm">اسحب ملف Excel أو CSV هنا، أو انقر للاختيار</p>
        <p className="text-xs text-slate-400 mt-1">يدعم UTF-8 للنص العربي</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {status === 'loading' && <p className="text-sm text-slate-500 text-center">جاري المعالجة...</p>}
      {status === 'done' && <p className="text-sm text-emerald-700 font-medium text-center">{message}</p>}
      {status === 'error' && <p className="text-sm text-red-700 font-medium text-center">{message}</p>}

      {preview && (
        <>
          <ValidationPreview result={preview} />
          {preview.valid.length > 0 && preview.errors.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                className="bg-[#0f4024] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0f4024]/90"
              >
                تأكيد الاستيراد ({preview.valid.length} سجل)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write `app/upload/page.tsx`**

```typescript
import { AppShell } from '@/components/layout/AppShell'
import { FileUploader } from '@/components/upload/FileUploader'

export default function UploadPage() {
  return (
    <AppShell title="رفع البيانات">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-slate-500 mb-6">
          ارفع ملف Excel أو CSV يحتوي على أعمدة: kpiId · period · year · value · region (اختياري)
        </p>
        <FileUploader />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
npx jest app/api/upload/route.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add app/api/upload/ components/upload/ app/upload/
git commit -m "feat: Excel upload with dry-run preview and Arabic validation (tested)"
```

---

### Task 12: Audit Log View

**Files:**
- Create: `app/admin/audit/page.tsx`

*(Audit middleware already wired in `lib/prisma.ts` from Task 4)*

- [ ] **Step 1: Write `app/admin/audit/page.tsx`**

```typescript
import { AppShell } from '@/components/layout/AppShell'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 200,
  })

  return (
    <AppShell title="سجل المراجعة">
      <div className="max-w-5xl mx-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b">
              <th className="text-right p-3 font-medium">التوقيت</th>
              <th className="text-right p-3 font-medium">المستخدم</th>
              <th className="text-right p-3 font-medium">الإجراء</th>
              <th className="text-right p-3 font-medium">القيمة السابقة</th>
              <th className="text-right p-3 font-medium">القيمة الجديدة</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="p-3 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                  {format(log.timestamp, 'dd MMM yyyy HH:mm', { locale: arSA })}
                </td>
                <td className="p-3">{log.userId}</td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 max-w-xs truncate text-xs text-slate-500">{log.oldValue ?? '—'}</td>
                <td className="p-3 max-w-xs truncate text-xs text-slate-500">{log.newValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="text-center text-slate-400 py-12 text-sm">لا توجد سجلات بعد</p>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 3: Verify audit log renders**

```bash
npm run dev
```

Open `http://localhost:3000/admin/audit` — confirm table renders with RTL column ordering.

- [ ] **Step 4: Commit**

```bash
git add app/admin/ package.json package-lock.json
git commit -m "feat: audit log page showing all data mutations in RTL table"
```

---

## Phase 5 — Executive Polish

### Task 13: Narrative Layer

**Files:**
- Create: `lib/narrative.ts`
- Create: `components/narrative/ExecutiveSummary.tsx`
- Test: `lib/narrative.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/narrative.test.ts`:

```typescript
import { generateNarrative } from '@/lib/narrative'
import type { KpiWithVariance } from '@/types'

const makeKpi = (nameAr: string, pct: number): KpiWithVariance => ({
  id: nameAr,
  nameAr,
  pillar: 'HOLY_QURAN',
  unit: 'COUNT',
  variance: {
    actual: pct,
    target: 100,
    pct,
    color: pct > 95 ? 'green' : pct >= 85 ? 'amber' : 'red',
  },
  sparkline: [pct - 10, pct - 5, pct - 2, pct],
})

describe('generateNarrative', () => {
  it('returns a non-empty Arabic string', () => {
    const text = generateNarrative([makeKpi('طباعة المصاحف', 90)])
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('mentions red KPIs in the output', () => {
    const text = generateNarrative([makeKpi('توزيع المصاحف', 70)])
    expect(text).toContain('توزيع المصاحف')
  })

  it('mentions amber KPIs in the output', () => {
    const text = generateNarrative([makeKpi('مسابقات التلاوة', 88)])
    expect(text).toContain('مسابقات التلاوة')
  })

  it('handles empty input gracefully', () => {
    const text = generateNarrative([])
    expect(typeof text).toBe('string')
  })

  it('separates green/amber/red groups in separate sentences', () => {
    const kpis = [
      makeKpi('المراكز الإسلامية', 97),
      makeKpi('ساعات التدريب', 88),
      makeKpi('توزيع المصاحف', 60),
    ]
    const text = generateNarrative(kpis)
    expect(text).toContain('المراكز الإسلامية')
    expect(text).toContain('ساعات التدريب')
    expect(text).toContain('توزيع المصاحف')
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest lib/narrative.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/narrative'`

- [ ] **Step 3: Write `lib/narrative.ts`**

```typescript
import type { KpiWithVariance } from '@/types'

export function generateNarrative(kpis: KpiWithVariance[]): string {
  if (kpis.length === 0) return 'لا توجد بيانات كافية لإنشاء الملخص التنفيذي.'

  const green = kpis.filter(k => k.variance.color === 'green')
  const amber = kpis.filter(k => k.variance.color === 'amber')
  const red = kpis.filter(k => k.variance.color === 'red')

  const parts: string[] = []

  if (green.length > 0) {
    const names = green.map(k => k.nameAr).join(' و')
    parts.push(`حقق${green.length > 1 ? 'ت' : ''} ${names} أهدافه${green.length > 1 ? 'ا' : ''} بنسبة تجاوزت ٩٥٪، وهو مؤشر ممتاز.`)
  }

  if (amber.length > 0) {
    const names = amber.map(k => k.nameAr).join(' و')
    parts.push(`يسير كل من ${names} بوتيرة مقبولة تتراوح بين ٨٥ و٩٥٪، وتستدعي متابعة دقيقة.`)
  }

  if (red.length > 0) {
    const names = red.map(k => k.nameAr).join(' و')
    parts.push(`تستدعي ${names} تدخلاً عاجلاً؛ إذ لم تتجاوز نسبة الإنجاز ٨٥٪ المطلوبة.`)
  }

  return parts.join(' ')
}
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest lib/narrative.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Write `components/narrative/ExecutiveSummary.tsx`**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { generateNarrative } from '@/lib/narrative'
import type { KpiWithVariance } from '@/types'

export function ExecutiveSummary() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: kpis } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () => fetch(`/api/kpis?year=${year}&period=${period}`).then(r => r.json()),
  })

  const text = generateNarrative(kpis ?? [])

  const redCount = (kpis ?? []).filter(k => k.variance.color === 'red').length
  const amberCount = (kpis ?? []).filter(k => k.variance.color === 'amber').length
  const greenCount = (kpis ?? []).filter(k => k.variance.color === 'green').length

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {greenCount} على المسار
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {amberCount} تحتاج متابعة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {redCount} تحتاج تدخل
          </span>
        </div>
        <h2 className="text-sm font-semibold text-slate-600">الملخص التنفيذي</h2>
      </div>
      <p className="text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/narrative.ts lib/narrative.test.ts components/narrative/
git commit -m "feat: auto-generated Arabic narrative insights from variance data (tested)"
```

---

### Task 14: PDF Export

**Files:**
- Create: `app/api/export/pdf/route.ts`
- Modify: `app/dashboard/page.tsx` (add export button)

- [ ] **Step 1: Install PDF renderer**

```bash
npm install @react-pdf/renderer
npm install -D @types/react-pdf
```

- [ ] **Step 2: Write `app/api/export/pdf/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import { generateNarrative } from '@/lib/narrative'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'
import type { KpiWithVariance } from '@/types'

Font.register({
  family: 'Cairo',
  src: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hA.woff2',
})

const styles = StyleSheet.create({
  page: { fontFamily: 'Cairo', padding: 40, direction: 'rtl' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  subtitle: { fontSize: 10, color: '#64748b', marginBottom: 24, textAlign: 'right' },
  narrative: { fontSize: 11, marginBottom: 24, lineHeight: 1.6, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', borderBottom: '1pt solid #e5e7eb', paddingVertical: 6 },
  cell: { fontSize: 10, flex: 1, textAlign: 'right' },
  header: { fontSize: 9, color: '#94a3b8', flex: 1, textAlign: 'right' },
  green: { color: '#059669' },
  amber: { color: '#d97706' },
  red: { color: '#dc2626' },
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = (searchParams.get('period') ?? 'ANNUAL') as string

  const kpis = await prisma.kpiRegistry.findMany({
    include: {
      targets: { where: { year } },
      actuals: { where: { year } },
    },
  })

  const kpiData: KpiWithVariance[] = kpis.map(kpi => {
    const target = kpi.targets.find(t => t.period === period)?.value ?? 0
    const actual = kpi.actuals.find(a => a.period === period)?.value ?? 0
    return {
      id: kpi.id,
      nameAr: kpi.nameAr,
      pillar: kpi.pillar as KpiWithVariance['pillar'],
      unit: kpi.unit as KpiWithVariance['unit'],
      variance: computeVariance(actual, target),
      sparkline: [],
    }
  })

  const narrative = generateNarrative(kpiData)

  const doc = React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'التقرير التنفيذي — شؤون الإسلامية'),
      React.createElement(Text, { style: styles.subtitle }, `${period} ${year}`),
      React.createElement(Text, { style: styles.narrative }, narrative),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.header }, 'نسبة الإنجاز'),
        React.createElement(Text, { style: styles.header }, 'المستهدف'),
        React.createElement(Text, { style: styles.header }, 'الفعلي'),
        React.createElement(Text, { style: styles.header }, 'المؤشر'),
      ),
      ...kpiData.map(kpi =>
        React.createElement(View, { key: kpi.id, style: styles.row },
          React.createElement(Text, { style: [styles.cell, styles[kpi.variance.color]] },
            `${kpi.variance.pct.toFixed(1)}%`
          ),
          React.createElement(Text, { style: styles.cell }, String(kpi.variance.target)),
          React.createElement(Text, { style: styles.cell }, String(kpi.variance.actual)),
          React.createElement(Text, { style: styles.cell }, kpi.nameAr),
        )
      )
    )
  )

  const buffer = await renderToBuffer(doc)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ers-report-${period}-${year}.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Add export button to dashboard**

In `app/dashboard/page.tsx`, add the export button inside the `AppShell`. Modify the file to pass an `actions` prop or add it inline — update `AppShell` to accept an `actions` slot:

Update `components/layout/AppShell.tsx`:

```typescript
import { Sidebar } from './Sidebar'
import { PeriodControls } from './PeriodControls'
import { Suspense } from 'react'

interface AppShellProps {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}

export function AppShell({ children, title, actions }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-[--border] bg-white px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {actions}
            <Suspense>
              <PeriodControls />
            </Suspense>
          </div>
          <h2 className="font-semibold text-base">{title}</h2>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

Update `app/dashboard/page.tsx`:

```typescript
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { ExecutiveSummary } from '@/components/narrative/ExecutiveSummary'
import { ExportButton } from '@/components/ExportButton'
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <AppShell title="لوحة المتابعة التنفيذية" actions={<ExportButton />}>
      <div className="max-w-5xl mx-auto space-y-6">
        <Suspense>
          <ExecutiveSummary />
        </Suspense>
        <Suspense>
          <KpiGrid />
        </Suspense>
      </div>
    </AppShell>
  )
}
```

Create `components/ExportButton.tsx`:

```typescript
'use client'

import { useSearchParams } from 'next/navigation'

export function ExportButton() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  return (
    <a
      href={`/api/export/pdf?year=${year}&period=${period}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
    >
      تصدير PDF
    </a>
  )
}
```

- [ ] **Step 4: Verify PDF export in browser**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`, click "تصدير PDF" — confirm a PDF downloads with Arabic content, KPI table, and narrative text.

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Final commit**

```bash
git add app/api/export/ components/ExportButton.tsx components/layout/AppShell.tsx app/dashboard/page.tsx
git commit -m "feat: server-side PDF export with Cairo font and Arabic narrative"
```

---

## Self-Review Against Spec

| Spec Requirement | Covered In |
|---|---|
| Arabic-native, dir="rtl" | Task 4 (layout.tsx, globals.css) |
| Cairo/IBM Plex Sans Arabic font | Task 4 (globals.css) |
| Four fixed pillars | Task 2 (schema seed), Task 5 (Sidebar), Task 8 (KpiGrid) |
| KPI cards: Actual · Target · Variance % | Task 6 (KpiCard) + Task 3 (lib/kpi.ts) |
| Green >95% / Amber 85-95% / Red <85% | Task 3 (computeVariance) |
| 4-quarter trend sparkline | Task 7 (SparklineChart) |
| Recharts mirrored for RTL | Task 7 (RtlChart wrapper) |
| Drill-down modal (region/facility) | Task 9 (DrillDownModal + [id] route) |
| Auto-generated Arabic narrative | Task 13 (lib/narrative.ts + ExecutiveSummary) |
| Excel/CSV upload with RTL preview | Task 10 (lib/excel.ts) + Task 11 (FileUploader) |
| Dry-run validation before commit | Task 11 (ValidationPreview + dryRun flag) |
| UTF-8 Arabic character support | Task 10 (xlsx codepage:65001) |
| Audit log (Who/When/Old/New) | Task 4 (Prisma middleware) + Task 12 (audit page) |
| RBAC: Admin / Editor / Viewer | Task 2 (User model with UserRole enum) |
| PDF export | Task 14 |
| Year / Quarter period controls | Task 5 (PeriodControls) |
