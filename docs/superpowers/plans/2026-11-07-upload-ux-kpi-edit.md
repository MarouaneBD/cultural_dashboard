# Upload UX + KPI Metadata Edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split upload error categories so users see clear, actionable feedback (staged vs. rejected vs. failed), and give admins a simple in-place edit for KPI name/type typos.

**Architecture:** Server returns three separate outcome buckets (`staged`, `scopeErrors[]`, `dbErrors[]`) instead of a single `errors[]` mix. UI renders each bucket as its own line. A new `GET/PATCH /api/admin/kpis/[id]` route handles rare KPI metadata corrections; a hover pencil icon on `KpiGrid` surfaces it to admins.

**Tech Stack:** Next.js App Router, Prisma, React Query (`useQuery`/`useQueryClient`), Tailwind CSS, lucide-react, existing `withAuditUser` audit hook.

## Global Constraints

- All user-visible strings are Arabic
- `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` on every new API route
- RBAC enforced server-side; never rely on UI gating alone — check role in every mutating route
- Pillar (`KpiRegistry.pillar`) is immutable — never expose it as editable in any form or route
- `withAuditUser` required for all writes to `KpiRegistry`, `Actual`, `Target`
- No new npm dependencies — use existing Prisma, React Query, Tailwind, lucide-react
- Arabic name minimum length: 3 characters; reject shorter names with `400`
- KPI uniqueness constraint is `(nameAr, pillar)` — collision check must scope to the same pillar

---

## File Map

| Task | Files |
|------|-------|
| 1 | `types/index.ts` |
| 2 | `app/api/upload/route.ts`, `app/api/upload/route.test.ts` |
| 3 | `components/upload/ValidationPreview.tsx` |
| 4 | `components/upload/FileUploader.tsx` |
| 5 | `app/api/admin/kpis/[id]/route.ts` (create), `app/api/admin/kpis/route.test.ts` (create) |
| 6 | `components/admin/KpiEditModal.tsx` (create) |
| 7 | `components/kpi/KpiCard.tsx`, `components/kpi/KpiGrid.tsx` |

---

### Task 1: Update shared types

**Files:**
- Modify: `types/index.ts`

**Interfaces:**
- Produces: `ActivityUploadResult` (updated — `parseErrors` + `scopeErrors` replace `errors`), `UploadCommitResult` (new), used by Tasks 3, 4

- [ ] **Step 1: Update `types/index.ts`**

Replace the existing `ActivityUploadResult`, `ActivityUploadResponse`, and `ActivityUploadResponseWithQueue` interfaces with the following. Keep all other types unchanged.

```ts
// In types/index.ts — replace the three interfaces below:

// Dry-run result (returned by upload route when dryRun=true, consumed by ValidationPreview)
export interface ActivityUploadResult {
  rows: ActivityRow[]
  parseErrors: Array<{ row: number; message: string }>
  scopeErrors: Array<{ row: number; message: string }>
}

// Commit result (returned by upload route when dryRun=false, consumed by FileUploader)
export interface UploadCommitResult {
  created: number
  updated: number
  staged: number
  submissionId: string | null
  scopeErrors: Array<{ row: number; message: string }>
  dbErrors: Array<{ row: number; message: string }>
}
```

Remove these interfaces entirely (they are replaced by the two above):
- `ActivityUploadResponse`
- `ActivityUploadResponseWithQueue`

- [ ] **Step 2: Run the type checker to confirm no other files reference the removed interfaces**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in `app/api/upload/route.ts` and `components/upload/FileUploader.tsx` — those are fixed in later tasks. If errors appear in other files, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "refactor(types): split upload errors into scopeErrors/dbErrors/parseErrors"
```

---

### Task 2: Update upload route and route tests

**Files:**
- Modify: `app/api/upload/route.ts`
- Modify: `app/api/upload/route.test.ts`

**Interfaces:**
- Consumes: `UploadCommitResult`, `ActivityUploadResult` from Task 1
- Produces: dry-run response shape `{ dryRun, rows, parseErrors, scopeErrors }`, commit response shape `{ created, updated, staged, submissionId, scopeErrors, dbErrors }`

- [ ] **Step 1: Write the failing tests first**

In `app/api/upload/route.test.ts`, update the existing tests that reference `body.errors` or `body.queued` to reference the new fields, and add two new tests. The full updated test file:

```ts
// app/api/upload/route.test.ts
import * as XLSX from 'xlsx'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()

jest.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

function makeTxMock(kpiExisting: null | object) {
  return {
    kpiRegistry: {
      findUnique: jest.fn().mockResolvedValue(kpiExisting),
      upsert: jest.fn().mockResolvedValue(kpiExisting ?? { id: 'kpi-new' }),
    },
    target: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    actual: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
    },
    uploadSubmission: {
      create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    },
  }
}

let mockTx = makeTxMock(null)

jest.mock('@/lib/prisma', () => ({
  withAuditUser: jest.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  prisma: {
    $transaction: jest.fn(async (fn: (_tx: unknown) => Promise<unknown>) => fn(mockTx)),
    kpiRegistry: { findMany: jest.fn().mockResolvedValue([]) },
    actual: { create: jest.fn().mockResolvedValue({}) },
    submissionRow: { count: jest.fn().mockResolvedValue(2) },
  },
}))

let mockParseActivityFile = jest.requireActual('@/lib/excel').parseActivityFile

jest.mock('@/lib/excel', () => {
  const actual = jest.requireActual('@/lib/excel')
  return {
    ...actual,
    parseActivityFile: (...args: unknown[]) => mockParseActivityFile(...args),
  }
})

function makeActivityBuffer(nameAr = 'برامج التعليم'): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([{
    'الوحدة التنظيمية': 'ادارة التعليم',
    'الأنشطة': nameAr,
    '2025': 80,
    'المستهدف 2026': 100,
    '2026 Q1': 85,
    'الفئة': 'تعليم',
  }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function makeRequest(buffer: ArrayBuffer, dryRun = false): NextRequest {
  const form = new FormData()
  form.append('file', new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), 'test.xlsx')
  form.append('dryRun', String(dryRun))
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: form })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'EDUCATION' } })
})

function makeLegacyBuffer(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([{ kpiId: 'kpi-01', period: 'Q1', year: 2026, value: 85 }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

it('returns 400 for legacy-format files (no الأنشطة column)', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  const res = await POST(makeRequest(makeLegacyBuffer()))
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toMatch('صيغة الملف غير مدعومة')
})

it('dry-run returns parseErrors and scopeErrors as separate arrays', async () => {
  mockTx = makeTxMock(null)
  const res = await POST(makeRequest(makeActivityBuffer(), true))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.dryRun).toBe(true)
  expect(body.rows).toHaveLength(1)
  expect(Array.isArray(body.parseErrors)).toBe(true)
  expect(Array.isArray(body.scopeErrors)).toBe(true)
  // No errors — EDITOR uploading own pillar
  expect(body.scopeErrors).toHaveLength(0)
})

it('dry-run: EDITOR uploading wrong pillar gets scope error in scopeErrors', async () => {
  // EDITOR assigned to ORPHANS tries to upload EDUCATION data
  mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'ORPHANS' } })
  const res = await POST(makeRequest(makeActivityBuffer(), true))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.dryRun).toBe(true)
  expect(body.scopeErrors).toHaveLength(1)
  expect(body.scopeErrors[0].message).toMatch('ليس لديك صلاحية')
  expect(body.parseErrors).toHaveLength(0)
})

it('EDITOR: novel KPI is rejected — appears in scopeErrors, not dbErrors', async () => {
  mockTx = makeTxMock(null)
  const res = await POST(makeRequest(makeActivityBuffer('مؤشر جديد تماماً'), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.created).toBe(0)
  expect(body.updated).toBe(0)
  expect(body.scopeErrors).toHaveLength(1)
  expect(body.scopeErrors[0].message).toMatch('لا يمكن للمحرر')
  expect(body.dbErrors).toHaveLength(0)
  expect(mockTx.kpiRegistry.upsert).not.toHaveBeenCalled()
})

it('EDITOR: existing KPI is updated — scopeErrors and dbErrors are empty', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.updated).toBe(1)
  expect(body.scopeErrors).toHaveLength(0)
  expect(body.dbErrors).toHaveLength(0)
  expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
})

it('ADMIN: novel KPI is created — scopeErrors and dbErrors are empty', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  mockTx = makeTxMock(null)
  const res = await POST(makeRequest(makeActivityBuffer('مؤشر إداري جديد'), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.created).toBe(1)
  expect(body.scopeErrors).toHaveLength(0)
  expect(body.dbErrors).toHaveLength(0)
  expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
})

it('EDITOR: staged rows use field name `staged`, not `queued`', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  mockTx.target.findUnique.mockResolvedValue(null)
  mockTx.actual.findUnique.mockResolvedValue(null)

  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.staged).toBeGreaterThan(0)
  expect(body.queued).toBeUndefined()   // old field must be gone
  expect(mockTx.target.upsert).not.toHaveBeenCalled()
  expect(mockTx.actual.upsert).not.toHaveBeenCalled()
  expect(mockTx.uploadSubmission.create).toHaveBeenCalledTimes(1)
  const createCall = mockTx.uploadSubmission.create.mock.calls[0][0]
  const stagedRows: Array<{ oldValue: number }> = createCall.data.rows.create
  expect(stagedRows.every(r => r.oldValue === 0)).toBe(true)
})

it('EDITOR: existing row produces correct oldValue in staged rows', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  mockTx.target.findUnique.mockResolvedValue({ value: 90 })
  mockTx.actual.findUnique.mockResolvedValue({ value: 75 })

  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.staged).toBeGreaterThan(0)
  const createCall = mockTx.uploadSubmission.create.mock.calls[0][0]
  const stagedRows: Array<{ oldValue: number }> = createCall.data.rows.create
  expect(stagedRows.map(r => r.oldValue)).toContain(90)
})

function makeActivityBufferWithDirtyCategory(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([{
    'الوحدة التنظيمية': 'ادارة التعليم',
    'الأنشطة': 'برامج التعليم',
    '2025': 80,
    'المستهدف 2026': 100,
    '2026 Q1': 85,
    'الفئة': 'تعليم ',
  }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

it('ADMIN: owner is normalized (trimmed) before upsert', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  mockTx = makeTxMock(null)

  mockParseActivityFile = jest.fn().mockReturnValue({
    rows: [{
      nameAr: 'برامج التعليم',
      pillar: 'EDUCATION',
      category: 'تعليم ',
      actual2025: 80,
      target2026: 100,
      actuals: { Q1: 85 },
      activityType: 'MONTHLY_VARIANCE',
    }],
    errors: [],
  })

  await POST(makeRequest(makeActivityBufferWithDirtyCategory(), false))

  expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
  const upsertCall = mockTx.kpiRegistry.upsert.mock.calls[0][0]
  expect(upsertCall.create.owner).toBe('تعليم')

  mockParseActivityFile = jest.requireActual('@/lib/excel').parseActivityFile
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npx jest app/api/upload/route.test.ts --no-coverage 2>&1 | tail -30
```

Expected: several FAIL — `body.errors is not iterable` or `expect(body.staged).toBeGreaterThan(0)` failures. If all pass, the route was already updated — skip to Step 5.

- [ ] **Step 3: Update the upload route response shapes**

In `app/api/upload/route.ts`, make two targeted changes:

**Change A — dry-run return (around line 88):**
```ts
// BEFORE:
return NextResponse.json({ dryRun: true, rows, errors: [...errors, ...dryRunScopeErrors] })

// AFTER:
return NextResponse.json({ dryRun: true, rows, parseErrors: errors, scopeErrors: dryRunScopeErrors })
```

**Change B — commit return (around lines 227-237):**
```ts
// BEFORE:
const queued = submissionId
  ? await prisma.submissionRow.count({ where: { submissionId } })
  : 0

return NextResponse.json({
  created,
  updated,
  queued,
  submissionId,
  errors: [...errors, ...dbErrors, ...scopeErrors],
})

// AFTER:
const staged = submissionId
  ? await prisma.submissionRow.count({ where: { submissionId } })
  : 0

return NextResponse.json({
  created,
  updated,
  staged,
  submissionId,
  scopeErrors,
  dbErrors: [...errors, ...dbErrors],
})
```

(Note: `errors` here is the array from `parseActivityFile` — fold parse errors into `dbErrors` since they represent rows that couldn't be processed.)

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/api/upload/route.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/upload/route.ts app/api/upload/route.test.ts
git commit -m "feat(upload): split errors into scopeErrors/dbErrors; rename queued→staged"
```

---

### Task 3: Update ValidationPreview

**Files:**
- Modify: `components/upload/ValidationPreview.tsx`

**Interfaces:**
- Consumes: `ActivityUploadResult` from Task 1 (now has `parseErrors` + `scopeErrors`)
- Produces: updated `ValidationPreview` component (same export name, updated props)

- [ ] **Step 1: Rewrite `ValidationPreview.tsx`**

```tsx
// components/upload/ValidationPreview.tsx
import type { ActivityUploadResult } from '@/types'
import { DEPT_MAP } from '@/lib/departments'
import { REPORTING_YEAR } from '@/lib/config'

type Props = { mode: 'activity'; result: ActivityUploadResult }

function ErrorList({ title, errors, color }: {
  title: string
  errors: Array<{ row: number; message: string }>
  color: 'red' | 'amber'
}) {
  if (errors.length === 0) return null
  const styles = color === 'red'
    ? { border: 'border-red-200', bg: 'bg-red-50', heading: 'text-red-700', text: 'text-red-600' }
    : { border: 'border-amber-200', bg: 'bg-amber-50', heading: 'text-amber-700', text: 'text-amber-600' }
  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}>
      <p className={`text-sm font-semibold ${styles.heading} mb-2`}>{title} ({errors.length})</p>
      <ul className={`text-xs ${styles.text} space-y-1`}>
        {errors.map((e, i) => <li key={i}>صف {e.row}: {e.message}</li>)}
      </ul>
    </div>
  )
}

export function ValidationPreview(props: Props) {
  const { parseErrors, scopeErrors, rows } = props.result

  return (
    <div className="space-y-4">
      <ErrorList title="أخطاء الصلاحيات" errors={scopeErrors} color="red" />
      <ErrorList title="أخطاء تحليل الملف" errors={parseErrors} color="amber" />

      {rows.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">{rows.length} نشاط جاهز للاستيراد</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-right p-2 border">الوحدة التنظيمية</th>
                <th className="text-right p-2 border">الأنشطة</th>
                <th className="text-right p-2 border">نوع النشاط</th>
                <th className="text-right p-2 border">الفئة</th>
                <th className="text-right p-2 border">{REPORTING_YEAR - 1}</th>
                <th className="text-right p-2 border">المستهدف {REPORTING_YEAR}</th>
                <th className="text-right p-2 border">Q1 {REPORTING_YEAR}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border font-cairo">{DEPT_MAP[row.pillar]?.labelAr ?? row.pillar}</td>
                  <td className="p-2 border font-cairo">{row.nameAr}</td>
                  <td className="p-2 border font-cairo">
                    {row.activityType === 'CUMULATIVE' ? 'تراكمي' : 'شهري'}
                  </td>
                  <td className="p-2 border">{row.category ?? '—'}</td>
                  <td className="p-2 border tabular-nums">{row.actual2025?.toLocaleString('ar-AE') ?? '—'}</td>
                  <td className="p-2 border tabular-nums">{row.target2026?.toLocaleString('ar-AE') ?? '—'}</td>
                  <td className="p-2 border tabular-nums">{row.actuals.Q1?.toLocaleString('ar-AE') ?? '—'}</td>
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

- [ ] **Step 2: Run type checker**

```bash
npx tsc --noEmit 2>&1 | grep -i "ValidationPreview\|ActivityUploadResult" | head -20
```

Expected: no errors involving `ValidationPreview`.

- [ ] **Step 3: Commit**

```bash
git add components/upload/ValidationPreview.tsx
git commit -m "feat(upload): split ValidationPreview errors into scope/parse sections"
```

---

### Task 4: Update FileUploader

**Files:**
- Modify: `components/upload/FileUploader.tsx`

**Interfaces:**
- Consumes: `UploadCommitResult` from Task 1, updated `ActivityUploadResult` from Task 1
- Produces: updated `FileUploader` component with structured result display

- [ ] **Step 1: Rewrite `FileUploader.tsx`**

The full replacement (preserving all existing logic, updating only the commit handling and result display):

```tsx
// components/upload/FileUploader.tsx
'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ValidationPreview } from './ValidationPreview'
import type { ActivityUploadResult, UploadCommitResult, UploadSubmissionClient } from '@/types'
import { REPORTING_YEAR } from '@/lib/config'

type PreviewState = { mode: 'activity'; result: ActivityUploadResult }

export function FileUploader() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = sessionStatus !== 'loading' && session?.user?.role === 'ADMIN'
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [commitResult, setCommitResult] = useState<UploadCommitResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [clearing, setClearing] = useState(false)
  const qc = useQueryClient()

  const { data: submissionsData } = useQuery<UploadSubmissionClient[]>({
    queryKey: ['editor-submissions-count'],
    queryFn: () => fetch('/api/upload/submissions').then(r => r.json()),
    enabled: !isAdmin && sessionStatus === 'authenticated',
    refetchInterval: 30000,
  })
  const pendingCount = submissionsData
    ? submissionsData.reduce((sum, s) => sum + s.rows.filter(r => r.status === 'PENDING' || r.status === 'REJECTED').length, 0)
    : 0

  async function handleFile(file: File) {
    setActiveFile(file)
    setStatus('loading')
    setPreview(null)
    setCommitResult(null)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dryRun', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      let body: Record<string, unknown> | null = null
      try { body = await res.json() } catch { /* non-JSON response */ }
      if (!res.ok) {
        setErrorMessage(`خطأ ${res.status} من الخادم — ${(body?.error as string | undefined) ?? 'حاول مجدداً'}`)
        setStatus('error')
        return
      }

      if (body !== null && 'rows' in body) {
        setPreview({ mode: 'activity', result: body as unknown as ActivityUploadResult })
        setStatus('idle')
      } else {
        setErrorMessage('خطأ: صيغة ملف غير مدعومة')
        setStatus('error')
      }
    } catch {
      setErrorMessage('تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً')
      setStatus('error')
    }
  }

  async function handleCommit() {
    if (!activeFile) return
    setStatus('loading')
    setCommitResult(null)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', activeFile)
      formData.append('dryRun', 'false')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      let body: Record<string, unknown> | null = null
      try { body = await res.json() } catch { /* non-JSON response */ }
      if (!res.ok) {
        setErrorMessage(`خطأ ${res.status} من الخادم — ${(body?.error as string | undefined) ?? 'حاول مجدداً'}`)
        setStatus('error')
        return
      }

      if (body !== null && 'created' in body) {
        const r = body as unknown as UploadCommitResult
        setCommitResult(r)
        setStatus('idle')
        setPreview(null)

        if (r.staged > 0) {
          qc.invalidateQueries({ queryKey: ['editor-submissions-count'] })
        }
      } else {
        setErrorMessage('خطأ: رد غير متوقع من الخادم')
        setStatus('error')
      }
    } catch {
      setErrorMessage('تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً')
      setStatus('error')
    }
  }

  async function handleClearData() {
    if (!confirm('سيتم حذف جميع الأنشطة والبيانات المخزنة. هل أنت متأكد؟')) return
    setClearing(true)
    try {
      const res = await fetch('/api/admin/clear-data', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setErrorMessage(body?.error ?? 'فشل مسح البيانات')
        setStatus('error')
      } else {
        setErrorMessage('')
        setCommitResult(null)
        setPreview(null)
        setActiveFile(null)
        // Show a simple success inline — no state for this, reuse error field with green styling omitted
        // (commit result panel will be empty; the confirm dialog already informed user)
      }
    } catch {
      setErrorMessage('تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً')
      setStatus('error')
    } finally {
      setClearing(false)
    }
  }

  const hasRows = preview ? preview.result.rows.length > 0 : false
  const hasNoScopeErrors = preview ? preview.result.scopeErrors.length === 0 : false
  const hasNoParseErrors = preview ? preview.result.parseErrors.length === 0 : false

  return (
    <div className="space-y-6">
      {/* Clear database — admin only */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={handleClearData}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            {clearing ? 'جاري المسح…' : 'مسح جميع البيانات'}
          </button>
        </div>
      )}

      {!isAdmin && pendingCount > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 text-sm"
          style={{ background: 'rgba(184,130,42,.12)', border: '1px solid rgba(184,130,42,.3)', color: 'var(--ink)' }}
        >
          <span>لديك <strong>{pendingCount}</strong> {pendingCount === 1 ? 'صف' : 'صفاً'} بانتظار المراجعة</span>
          <Link href="/upload/submissions" className="text-xs px-3 py-1 rounded-lg text-white" style={{ background: 'var(--accent)' }}>
            عرض التفاصيل
          </Link>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="منطقة رفع الملف — انقر أو اسحب ملف Excel"
        className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#0f4024] transition-colors"
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <p className="text-slate-500 text-sm">اسحب ملف Excel أو CSV هنا، أو انقر للاختيار</p>
        <p className="text-xs text-slate-400 mt-1">
          {`الأعمدة المتوقعة: الوحدة التنظيمية · الأنشطة · نوع النشاط · ${REPORTING_YEAR - 1} · المستهدف ${REPORTING_YEAR} · ${REPORTING_YEAR} Q1 · الفئة`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {status === 'loading' && <p className="text-sm text-slate-500 text-center">جاري المعالجة...</p>}
      {status === 'error' && <p className="text-sm text-red-700 font-medium text-center">{errorMessage}</p>}

      {/* Structured commit result */}
      {commitResult && (
        <div className="rounded-xl border p-4 space-y-1.5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          {commitResult.updated > 0 && (
            <p style={{ color: '#059669' }}>✓ {commitResult.updated} مؤشر حُدِّث مباشرة</p>
          )}
          {commitResult.staged > 0 && (
            <p style={{ color: '#b8822a' }}>⏳ {commitResult.staged} صف بانتظار موافقة المدير</p>
          )}
          {commitResult.scopeErrors.length > 0 && (
            <div>
              <p style={{ color: '#dc2626' }}>✗ {commitResult.scopeErrors.length} صف مرفوض: خارج نطاق الصلاحية</p>
              <p className="text-xs mt-0.5 mr-4" style={{ color: '#dc2626' }}>{commitResult.scopeErrors[0].message}</p>
            </div>
          )}
          {commitResult.dbErrors.length > 0 && (
            <p style={{ color: '#dc2626' }}>✗ {commitResult.dbErrors.length} صف فشل بسبب خطأ في الخادم</p>
          )}
          {commitResult.updated === 0 && commitResult.staged === 0 && commitResult.scopeErrors.length === 0 && commitResult.dbErrors.length === 0 && (
            <p style={{ color: 'var(--ink-muted)' }}>لم يتم معالجة أي صفوف</p>
          )}
        </div>
      )}

      {preview && (
        <>
          <ValidationPreview {...preview} />
          {hasRows && hasNoScopeErrors && hasNoParseErrors && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                className="bg-[#0f4024] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0f4024]/90"
              >
                تأكيد الاستيراد ({preview.result.rows.length} نشاط)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type checker**

```bash
npx tsc --noEmit 2>&1 | grep -i "FileUploader\|UploadCommitResult" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload/FileUploader.tsx
git commit -m "feat(upload): structured result panel; split scope/db errors; fix network error messages"
```

---

### Task 5: KPI admin route (GET + PATCH)

**Files:**
- Create: `app/api/admin/kpis/[id]/route.ts`
- Create: `app/api/admin/kpis/route.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/admin/kpis/[id]` → `{ id, nameAr, pillar, activityType, unit, owner }`
  - `PATCH /api/admin/kpis/[id]` → `{ id, nameAr, activityType, unit, owner }` (200) or error (400/403/404/409/500)

- [ ] **Step 1: Write failing tests**

Create `app/api/admin/kpis/route.test.ts`:

```ts
// app/api/admin/kpis/route.test.ts
import { GET, PATCH } from '@/app/api/admin/kpis/[id]/route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({ auth: (...args: unknown[]) => mockAuth(...args) }))

const mockKpi = {
  id: 'kpi-1',
  nameAr: 'برامج التعليم',
  pillar: 'EDUCATION',
  activityType: 'CUMULATIVE',
  unit: 'COUNT',
  owner: 'تعليم',
}

const mockPrisma = {
  kpiRegistry: {
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(mockKpi),
  },
}

jest.mock('@/lib/prisma', () => ({
  withAuditUser: jest.fn((_id: string, fn: () => Promise<unknown>) => fn()),
  prisma: mockPrisma,
}))

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
  mockPrisma.kpiRegistry.findUnique.mockResolvedValue(mockKpi)
  mockPrisma.kpiRegistry.findFirst.mockResolvedValue(null)
  mockPrisma.kpiRegistry.update.mockResolvedValue(mockKpi)
})

// ── GET ──────────────────────────────────────────────────────────────────────

it('GET: returns KPI data for admin', async () => {
  const res = await GET(
    new NextRequest('http://localhost/api/admin/kpis/kpi-1'),
    makeParams('kpi-1')
  )
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.id).toBe('kpi-1')
  expect(body.nameAr).toBe('برامج التعليم')
  expect(body.activityType).toBe('CUMULATIVE')
})

it('GET: returns 403 for non-admin', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'editor-1', role: 'EDITOR' } })
  const res = await GET(
    new NextRequest('http://localhost/api/admin/kpis/kpi-1'),
    makeParams('kpi-1')
  )
  expect(res.status).toBe(403)
})

it('GET: returns 404 for unknown KPI', async () => {
  mockPrisma.kpiRegistry.findUnique.mockResolvedValue(null)
  const res = await GET(
    new NextRequest('http://localhost/api/admin/kpis/unknown'),
    makeParams('unknown')
  )
  expect(res.status).toBe(404)
})

// ── PATCH ─────────────────────────────────────────────────────────────────────

it('PATCH: updates nameAr and returns updated record', async () => {
  mockPrisma.kpiRegistry.update.mockResolvedValue({ ...mockKpi, nameAr: 'برامج التعليم المحدّث' })
  const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
    method: 'PATCH',
    body: JSON.stringify({ nameAr: 'برامج التعليم المحدّث' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, makeParams('kpi-1'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.nameAr).toBe('برامج التعليم المحدّث')
})

it('PATCH: returns 403 for non-admin', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'editor-1', role: 'EDITOR' } })
  const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
    method: 'PATCH',
    body: JSON.stringify({ nameAr: 'جديد' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, makeParams('kpi-1'))
  expect(res.status).toBe(403)
})

it('PATCH: returns 400 when nameAr is too short (< 3 chars)', async () => {
  const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
    method: 'PATCH',
    body: JSON.stringify({ nameAr: 'أب' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, makeParams('kpi-1'))
  expect(res.status).toBe(400)
})

it('PATCH: returns 400 when no fields provided', async () => {
  const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
    method: 'PATCH',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, makeParams('kpi-1'))
  expect(res.status).toBe(400)
})

it('PATCH: returns 409 when nameAr collides with another KPI in same pillar', async () => {
  mockPrisma.kpiRegistry.findFirst.mockResolvedValue({ id: 'kpi-other', nameAr: 'مؤشر موجود', pillar: 'EDUCATION' })
  const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
    method: 'PATCH',
    body: JSON.stringify({ nameAr: 'مؤشر موجود' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, makeParams('kpi-1'))
  expect(res.status).toBe(409)
})

it('PATCH: pillar field is silently ignored', async () => {
  const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
    method: 'PATCH',
    body: JSON.stringify({ pillar: 'ORPHANS', nameAr: 'برامج محدّث' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, makeParams('kpi-1'))
  expect(res.status).toBe(200)
  const updateCall = mockPrisma.kpiRegistry.update.mock.calls[0][0]
  expect(updateCall.data.pillar).toBeUndefined()
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npx jest app/api/admin/kpis/route.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — module not found (route doesn't exist yet).

- [ ] **Step 3: Create the route**

Create directory and file: `app/api/admin/kpis/[id]/route.ts`

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params
  const kpi = await prisma.kpiRegistry.findUnique({ where: { id } })
  if (!kpi) return NextResponse.json({ error: 'المؤشر غير موجود' }, { status: 404 })

  return NextResponse.json({
    id: kpi.id,
    nameAr: kpi.nameAr,
    pillar: kpi.pillar,
    activityType: kpi.activityType,
    unit: kpi.unit,
    owner: kpi.owner,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params

  let body: { nameAr?: string; activityType?: string; unit?: string; owner?: string; pillar?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  // Pillar is immutable — silently exclude it
  const { nameAr, activityType, unit, owner } = body

  if (!nameAr && !activityType && !unit && owner === undefined) {
    return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 })
  }

  if (nameAr !== undefined && nameAr.trim().length < 3) {
    return NextResponse.json({ error: 'الاسم قصير جداً (3 أحرف على الأقل)' }, { status: 400 })
  }

  // Fetch current KPI to get pillar for uniqueness check
  const current = await prisma.kpiRegistry.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'المؤشر غير موجود' }, { status: 404 })

  if (nameAr) {
    const collision = await prisma.kpiRegistry.findFirst({
      where: { nameAr: nameAr.trim(), pillar: current.pillar, id: { not: id } },
    })
    if (collision) {
      return NextResponse.json({ error: 'هذا الاسم مستخدم لمؤشر آخر في نفس القسم' }, { status: 409 })
    }
  }

  const patch: Record<string, unknown> = {}
  if (nameAr) patch.nameAr = nameAr.trim()
  if (activityType) patch.activityType = activityType
  if (unit) patch.unit = unit
  if (owner !== undefined) patch.owner = owner || null

  try {
    const updated = await withAuditUser(session.user.id, () =>
      prisma.kpiRegistry.update({ where: { id }, data: patch })
    )
    return NextResponse.json({
      id: updated.id,
      nameAr: updated.nameAr,
      activityType: updated.activityType,
      unit: updated.unit,
      owner: updated.owner,
    })
  } catch (err) {
    console.error('[admin/kpis] update failed', err)
    return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/api/admin/kpis/route.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/kpis/[id]/route.ts app/api/admin/kpis/route.test.ts
git commit -m "feat(admin): GET + PATCH /api/admin/kpis/[id] for KPI metadata editing"
```

---

### Task 6: KpiEditModal component

**Files:**
- Create: `components/admin/KpiEditModal.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/kpis/[id]` and `PATCH /api/admin/kpis/[id]` from Task 5
- Produces: `KpiEditModal` component, props: `{ kpiId: string; onClose: () => void; onSaved: () => void }`

- [ ] **Step 1: Create `components/admin/KpiEditModal.tsx`**

```tsx
// components/admin/KpiEditModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type KpiData = {
  id: string
  nameAr: string
  activityType: string
  unit: string
  owner: string | null
}

interface Props {
  kpiId: string
  onClose: () => void
  onSaved: () => void
}

export function KpiEditModal({ kpiId, onClose, onSaved }: Props) {
  const [data, setData] = useState<KpiData | null>(null)
  const [nameAr, setNameAr] = useState('')
  const [activityType, setActivityType] = useState('')
  const [unit, setUnit] = useState('')
  const [owner, setOwner] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/kpis/${kpiId}`)
      .then(r => r.json())
      .then((d: KpiData) => {
        setData(d)
        setNameAr(d.nameAr)
        setActivityType(d.activityType)
        setUnit(d.unit)
        setOwner(d.owner ?? '')
        setLoading(false)
      })
      .catch(() => {
        setSubmitError('تعذّر تحميل بيانات المؤشر')
        setLoading(false)
      })
  }, [kpiId])

  async function handleSave() {
    setNameError('')
    setSubmitError('')

    if (nameAr.trim().length < 3) {
      setNameError('الاسم قصير جداً (3 أحرف على الأقل)')
      return
    }

    const patch: Record<string, string | null> = {}
    if (data && nameAr.trim() !== data.nameAr) patch.nameAr = nameAr.trim()
    if (data && activityType !== data.activityType) patch.activityType = activityType
    if (data && unit !== data.unit) patch.unit = unit
    if (data && (owner || null) !== data.owner) patch.owner = owner || null

    if (Object.keys(patch).length === 0) { onClose(); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/kpis/${kpiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (res.status === 409) {
        setNameError('هذا الاسم مستخدم لمؤشر آخر في نفس القسم')
        return
      }
      if (!res.ok) {
        setSubmitError(body.error ?? `خطأ ${res.status}`)
        return
      }
      onSaved()
      onClose()
    } catch {
      setSubmitError('تعذّر الاتصال بالخادم')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rounded-2xl w-full max-w-md p-6 space-y-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>تعديل بيانات المؤشر</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-alt)]">
            <X size={16} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {loading && <p className="text-sm text-center py-4" style={{ color: 'var(--ink-muted)' }}>جاري التحميل...</p>}

        {!loading && (
          <div className="space-y-3">
            {/* Arabic name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>
                الاسم بالعربية
              </label>
              <input
                type="text"
                dir="rtl"
                value={nameAr}
                onChange={e => { setNameAr(e.target.value); setNameError('') }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: nameError ? '#dc2626' : 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>

            {/* Activity type */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>نوع النشاط</label>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              >
                <option value="CUMULATIVE">تراكمي</option>
                <option value="MONTHLY_VARIANCE">شهري</option>
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>الوحدة</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              >
                <option value="COUNT">عدد</option>
                <option value="PERCENT">نسبة مئوية</option>
                <option value="CURRENCY">عملة</option>
              </select>
            </div>

            {/* Owner / category */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>الفئة (اختياري)</label>
              <input
                type="text"
                dir="rtl"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              />
            </div>

            {submitError && <p className="text-xs text-red-600">{submitError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg" style={{ color: 'var(--ink-muted)' }}>
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-lg text-white disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type checker**

```bash
npx tsc --noEmit 2>&1 | grep "KpiEditModal" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/KpiEditModal.tsx
git commit -m "feat(admin): KpiEditModal component for inline KPI metadata correction"
```

---

### Task 7: Wire edit button into KpiCard and KpiGrid

**Files:**
- Modify: `components/kpi/KpiCard.tsx`
- Modify: `components/kpi/KpiGrid.tsx`

**Interfaces:**
- Consumes: `KpiEditModal` from Task 6
- Produces: `KpiCard` gains optional `isAdmin` + `onEdit` props; `KpiGrid` manages edit modal state

- [ ] **Step 1: Update `KpiCard.tsx` to accept edit props**

Add `isAdmin?: boolean` and `onEdit?: () => void` to `KpiCardProps`. When both are set, render a small pencil icon in the top-right corner that stops propagation so clicking it doesn't trigger the card's `onClick`.

```tsx
// components/kpi/KpiCard.tsx
'use client'

import { formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import { Pencil } from 'lucide-react'
import type { KpiWithVariance } from '@/types'

const CARD_COLOR = '#0891b2'

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
  isAdmin?: boolean
  onEdit?: () => void
}

export function KpiCard({ kpi, onClick, isAdmin, onEdit }: KpiCardProps) {
  const { variance, unit } = kpi
  const fillPct = Math.min(Math.max(variance.pct, 0), 100)

  return (
    <button
      onClick={onClick}
      data-variance={variance.color}
      className="card-interactive w-full text-right rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-[3px] flex flex-col gap-3 border relative"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${CARD_COLOR}`,
      }}
    >
      {isAdmin && onEdit && (
        <span
          role="button"
          aria-label="تعديل المؤشر"
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="absolute top-3 left-3 p-1 rounded opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
          style={{ color: 'var(--ink-muted)' }}
        >
          <Pencil size={13} />
        </span>
      )}

      {/* Header: KPI name */}
      <p className="text-[13px] leading-snug text-right" style={{ color: 'var(--ink-soft)' }}>
        {kpi.nameAr}
      </p>

      {/* Body: sparkline + big number */}
      <div className="flex items-end justify-between gap-2">
        <div className="h-10 flex-shrink-0" style={{ width: '88px' }}>
          <SparklineChart data={kpi.sparkline} color={CARD_COLOR} />
        </div>
        <p
          className="font-fraunces font-medium text-[38px] leading-none flex-shrink-0"
          style={{ color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      {/* Footer: progress bar + labels */}
      <div className="flex flex-col gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--hair)' }}>
        <div className="flex items-center justify-between">
          <span className="font-jb text-[11px] font-medium" style={{ color: CARD_COLOR }}>
            {formatVariancePct(variance.pct)}
          </span>
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            المستهدف {formatValue(variance.target, unit)}
          </span>
        </div>

        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--hair)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${fillPct}%`, background: CARD_COLOR, transition: 'width .4s ease' }}
          />
        </div>
      </div>
    </button>
  )
}
```

Note: the `group-hover:opacity-100` Tailwind utility requires the card's outer `<button>` to have `group` class. Add it: change `className="card-interactive w-full..."` to `className="group card-interactive w-full..."`.

- [ ] **Step 2: Update `KpiGrid.tsx` to manage edit state**

```tsx
// components/kpi/KpiGrid.tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { REPORTING_YEAR } from '@/lib/config'
import { useSearchParams } from 'next/navigation'
import { KpiCard } from './KpiCard'
import { KpiEditModal } from '@/components/admin/KpiEditModal'
import type { KpiWithVariance, PillarId } from '@/types'

interface KpiGridProps {
  pillar: PillarId
  onKpiClick?: (_kpi: KpiWithVariance) => void
}

export function KpiGrid({ pillar, onKpiClick }: KpiGridProps) {
  const params = useSearchParams()
  const year = params.get('year') ?? String(REPORTING_YEAR)
  const period = params.get('period') ?? 'ANNUAL'
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const qc = useQueryClient()

  const [editingKpiId, setEditingKpiId] = useState<string | null>(null)

  const { data: kpis, isLoading, error } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period, pillar],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}&pillar=${pillar}`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch KPIs')
        return r.json()
      }),
  })

  if (error) {
    return (
      <div className="rounded-2xl border p-5 text-sm" style={{ background: '#fff5f5', borderColor: '#fecaca', color: '#dc2626' }}>
        تعذّر تحميل بيانات المؤشرات. يرجى المحاولة مجدداً.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
        ))}
      </div>
    )
  }

  const list = kpis ?? []

  if (!list.length) {
    return (
      <div
        className="rounded-2xl border p-10 text-center"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <p className="text-2xl mb-3">📋</p>
        <p className="font-cairo text-[14px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
          لا تتوفر مؤشرات بعد
        </p>
        <p className="font-cairo text-[12px]" style={{ color: 'var(--ink-muted)' }}>
          يمكن إضافة المؤشرات عبر صفحة رفع البيانات
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {list.map(kpi => (
          <KpiCard
            key={kpi.id}
            kpi={kpi}
            onClick={() => onKpiClick?.(kpi)}
            isAdmin={isAdmin}
            onEdit={() => setEditingKpiId(kpi.id)}
          />
        ))}
      </div>

      {editingKpiId && (
        <KpiEditModal
          kpiId={editingKpiId}
          onClose={() => setEditingKpiId(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['kpis'] })
            setEditingKpiId(null)
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Run type checker and existing tests**

```bash
npx tsc --noEmit 2>&1 | grep -i "KpiCard\|KpiGrid\|KpiEditModal" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/kpi/KpiCard.tsx components/kpi/KpiGrid.tsx
git commit -m "feat(admin): pencil icon on KPI cards opens metadata edit modal"
```

---

## Final Verification

After all 7 tasks:

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Tests (run from original repo root to avoid worktree path issue)
cd C:/Users/marwa/OneDrive/Documents/Projects/Cultural_Dashboard && npm test
```

Expected: 0 type errors, clean build, all tests pass.
