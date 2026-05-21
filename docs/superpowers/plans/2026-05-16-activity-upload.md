# Activity File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the upload tool to accept the user's Arabic-column Excel format (الوحدة التنظيمية · الأنشطة · 2025 · المستهدف 2026 · 2026 Q1 · الفئة) and write KpiRegistry + Target + Actual records in a single transaction per row.

**Architecture:** New `parseActivityFile()` in `lib/excel.ts` handles parsing. The API route auto-detects format via a header sniff (`isActivityFile()`). Prisma transactions guarantee atomicity per row. The UI preview table is format-aware — it renders the richer Arabic-column view for activity files, the existing table for legacy files.

**Tech Stack:** Next.js 16 App Router · TypeScript · Prisma 7 · `xlsx` · React Query · Tailwind CSS

---

## File Map

```
Modified:
  types/index.ts                          — add ActivityRow, ActivityUploadResult types
  lib/excel.ts                            — add isActivityFile(), parseActivityFile()
  lib/excel.test.ts                       — add tests for new functions
  app/api/upload/route.ts                 — format detection + activity transaction logic
  app/api/upload/route.test.ts            — add activity upload tests
  components/upload/ValidationPreview.tsx — format-aware preview table
  components/upload/FileUploader.tsx      — updated hint text + success message
```

---

## Task 1: Add `ActivityRow` and `ActivityUploadResult` types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add types to `types/index.ts`**

Append after the existing `UploadValidationResult` interface:

```typescript
export interface ActivityRow {
  nameAr: string
  pillar: PillarId
  category?: string
  actual2025?: number
  target2026?: number
  actuals: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>>
}

export interface ActivityUploadResult {
  rows: ActivityRow[]
  errors: Array<{ row: number; message: string }>
}

export interface ActivityUploadResponse {
  created: number
  updated: number
  errors: Array<{ row: number; message: string }>
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add ActivityRow and ActivityUploadResult types"
```

---

## Task 2: Add `isActivityFile()` and `parseActivityFile()` to `lib/excel.ts`

**Files:**
- Modify: `lib/excel.ts`

- [ ] **Step 1: Write failing tests in `lib/excel.test.ts`**

Append these two describe blocks to the existing test file:

```typescript
describe('isActivityFile', () => {
  function makeActivityBuffer(): ArrayBuffer {
    const ws = XLSX.utils.json_to_sheet([
      { 'الوحدة التنظيمية': 'ادارة التعليم', 'الأنشطة': 'نشاط 1', '2025': 80, 'المستهدف 2026': 100, '2026 Q1': 85, 'الفئة': 'تعليم' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  }

  it('returns true when الأنشطة header is present', () => {
    expect(isActivityFile(makeActivityBuffer())).toBe(true)
  })

  it('returns false for the legacy format', () => {
    const ws = XLSX.utils.json_to_sheet([{ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    expect(isActivityFile(buf)).toBe(false)
  })
})

describe('parseActivityFile', () => {
  function makeBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  }

  const validRow = {
    'الوحدة التنظيمية': 'ادارة التعليم',
    'الأنشطة': 'برامج التعليم القرآني',
    '2025': 80,
    'المستهدف 2026': 100,
    '2026 Q1': 85,
    'الفئة': 'تعليم',
  }

  it('parses a valid row correctly', () => {
    const result = parseActivityFile(makeBuffer([validRow]))
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
    const row = result.rows[0]
    expect(row.nameAr).toBe('برامج التعليم القرآني')
    expect(row.pillar).toBe('EDUCATION')
    expect(row.category).toBe('تعليم')
    expect(row.actual2025).toBe(80)
    expect(row.target2026).toBe(100)
    expect(row.actuals.Q1).toBe(85)
  })

  it('returns an error for an unrecognised department', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, 'الوحدة التنظيمية': 'قسم مجهول' }]))
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0].message).toMatch(/الوحدة التنظيمية/)
  })

  it('skips rows with an empty activity name silently', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, 'الأنشطة': '' }]))
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles missing optional columns gracefully', () => {
    const { 'الفئة': _, '2025': __, ...rowWithoutOptionals } = validRow
    const result = parseActivityFile(makeBuffer([rowWithoutOptionals]))
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].category).toBeUndefined()
    expect(result.rows[0].actual2025).toBeUndefined()
  })

  it('parses multiple quarterly actuals when present', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, '2026 Q2': 90, '2026 Q3': 92 }]))
    expect(result.rows[0].actuals.Q1).toBe(85)
    expect(result.rows[0].actuals.Q2).toBe(90)
    expect(result.rows[0].actuals.Q3).toBe(92)
    expect(result.rows[0].actuals.Q4).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/excel.test.ts --no-coverage
```

Expected: `isActivityFile` and `parseActivityFile` not found errors.

- [ ] **Step 3: Implement `isActivityFile` and `parseActivityFile` in `lib/excel.ts`**

Add the following after the existing `parseExcelFile` function:

```typescript
const DEPT_NAME_TO_PILLAR: Record<string, string> = {
  'ادارة التعليم':          'EDUCATION',
  'ادارة ثقافة الأسرة':    'FAMILY_CULTURE',
  'مركز المعلومات الاسلامي': 'ISLAMIC_INFO_CENTER',
  'مشروع البر - ذكور':     'AL_BIRR_MALE',
  'مشروع البر - اناث':     'AL_BIRR_FEMALE',
  'قسم الأيتام':            'ORPHANS',
  'مكتب البرامج العلمية':   'SCIENTIFIC_PROGRAMS',
}

const QUARTER_COL: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
  '2026 Q1': 'Q1',
  '2026 Q2': 'Q2',
  '2026 Q3': 'Q3',
  '2026 Q4': 'Q4',
}

export function isActivityFile(buffer: ArrayBuffer): boolean {
  try {
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const [headers] = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    return (headers ?? []).some(h => String(h).trim() === 'الأنشطة')
  } catch {
    return false
  }
}

export function parseActivityFile(buffer: ArrayBuffer): ActivityUploadResult {
  try {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const rows: ActivityRow[] = []
    const errors: Array<{ row: number; message: string }> = []

    rawRows.forEach((raw, index) => {
      const rowNum = index + 2
      const nameAr = String(raw['الأنشطة'] ?? '').trim()

      // Skip blank activity rows silently
      if (!nameAr) return

      const deptRaw = String(raw['الوحدة التنظيمية'] ?? '').trim()
      const pillar = DEPT_NAME_TO_PILLAR[deptRaw]

      if (!pillar) {
        errors.push({ row: rowNum, message: `الصف ${rowNum}: الوحدة التنظيمية غير معروفة "${deptRaw}"` })
        return
      }

      const toNum = (v: unknown) => {
        const n = Number(v)
        return isNaN(n) || v === '' ? undefined : n
      }

      const actuals: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
      for (const [col, q] of Object.entries(QUARTER_COL)) {
        const val = toNum(raw[col])
        if (val !== undefined) actuals[q] = val
      }

      rows.push({
        nameAr,
        pillar: pillar as import('@/types').PillarId,
        category: String(raw['الفئة'] ?? '').trim() || undefined,
        actual2025: toNum(raw['2025']),
        target2026: toNum(raw['المستهدف 2026']),
        actuals,
      })
    })

    return { rows, errors }
  } catch {
    return { rows: [], errors: [{ row: 0, message: 'تعذّر قراءة الملف — تأكد من أنه ملف Excel صالح' }] }
  }
}
```

Also add the import at the top of the file (after the existing imports):

```typescript
import type { ActivityRow, ActivityUploadResult } from '@/types'
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/excel.test.ts --no-coverage
```

Expected: all tests pass including the new ones.

- [ ] **Step 5: Commit**

```bash
git add lib/excel.ts lib/excel.test.ts
git commit -m "feat: add isActivityFile and parseActivityFile for Arabic-column Excel"
```

---

## Task 3: Update `/api/upload/route.ts` for activity format

**Files:**
- Modify: `app/api/upload/route.ts`
- Modify: `app/api/upload/route.test.ts`

- [ ] **Step 1: Write failing tests in `app/api/upload/route.test.ts`**

Add these tests to the existing file (or replace it if it's empty):

```typescript
import * as XLSX from 'xlsx'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (fn: any) => fn({
      kpiRegistry: {
        findUnique: jest.fn().mockResolvedValue(null), // null = new KPI → created++
        upsert: jest.fn().mockResolvedValue({ id: 'kpi-1' }),
      },
      target: { upsert: jest.fn().mockResolvedValue({}) },
      actual: {
        create: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
    })),
    kpiRegistry: { findMany: jest.fn().mockResolvedValue([]) },
    actual: { create: jest.fn().mockResolvedValue({}) },
  },
}))

function makeActivityBuffer(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([{
    'الوحدة التنظيمية': 'ادارة التعليم',
    'الأنشطة': 'برامج التعليم',
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
  form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'test.xlsx')
  form.append('dryRun', String(dryRun))
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: form })
}

it('returns dry-run preview for activity file', async () => {
  const res = await POST(makeRequest(makeActivityBuffer(), true))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.dryRun).toBe(true)
  expect(body.rows).toHaveLength(1)
  expect(body.rows[0].nameAr).toBe('برامج التعليم')
})

it('returns created/updated counts on commit', async () => {
  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(typeof body.created).toBe('number')
  expect(typeof body.updated).toBe('number')
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx jest app/api/upload/route.test.ts --no-coverage
```

Expected: tests fail (route doesn't handle activity format yet).

- [ ] **Step 3: Rewrite `app/api/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Period, Pillar } from '@prisma/client'
import { isActivityFile, parseActivityFile, parseExcelFile } from '@/lib/excel'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const dryRun = formData.get('dryRun') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()

    // ── Activity format ──────────────────────────────────────────────────────
    if (isActivityFile(buffer)) {
      const { rows, errors } = parseActivityFile(buffer)

      if (dryRun) {
        return NextResponse.json({ dryRun: true, rows, errors })
      }

      let created = 0
      let updated = 0
      const dbErrors: Array<{ row: number; message: string }> = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        try {
          await prisma.$transaction(async tx => {
            const existing = await (tx as any).kpiRegistry.findUnique({
              where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
            })

            const kpi = await (tx as any).kpiRegistry.upsert({
              where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
              create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category },
              update: row.category ? { owner: row.category } : {},
            })

            existing ? updated++ : created++

            if (row.target2026 !== undefined) {
              await (tx as any).target.upsert({
                where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: 2026 } },
                create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: 2026, value: row.target2026 },
                update: { value: row.target2026 },
              })
            }

            if (row.actual2025 !== undefined) {
              await (tx as any).actual.upsert({
                where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: 2025 } },
                create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: 2025, value: row.actual2025 },
                update: { value: row.actual2025 },
              })
            }

            for (const [q, val] of Object.entries(row.actuals)) {
              if (val !== undefined) {
                await (tx as any).actual.upsert({
                  where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: 2026 } },
                  create: { kpiId: kpi.id, period: q as Period, year: 2026, value: val },
                  update: { value: val },
                })
              }
            }
          })
        } catch (err) {
          dbErrors.push({ row: i + 2, message: `خطأ في حفظ النشاط: ${row.nameAr}` })
        }
      }

      return NextResponse.json({ created, updated, errors: [...errors, ...dbErrors] })
    }

    // ── Legacy format ────────────────────────────────────────────────────────
    const { valid, errors } = parseExcelFile(buffer)

    if (dryRun) {
      return NextResponse.json({ dryRun: true, preview: valid, errors })
    }

    const dbErrors: Array<{ row: number; message: string }> = []
    let imported = 0

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i]
      try {
        await prisma.actual.create({
          data: {
            kpiId: row.kpiId,
            period: row.period as Period,
            year: row.year,
            value: row.value,
            region: row.region,
            facility: row.facility,
          },
        })
        imported++
      } catch {
        dbErrors.push({ row: i + 2, message: `خطأ في حفظ البيانات: ${row.kpiId}` })
      }
    }

    return NextResponse.json({ imported, errors: [...errors, ...dbErrors] })
  } catch (err) {
    console.error('POST /api/upload failed', err)
    return NextResponse.json({ error: 'خطأ في معالجة الملف' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/api/upload/route.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/upload/route.ts app/api/upload/route.test.ts
git commit -m "feat: detect activity file format and commit with Prisma transactions"
```

---

## Task 4: Update `ValidationPreview` for the activity format

**Files:**
- Modify: `components/upload/ValidationPreview.tsx`

- [ ] **Step 1: Rewrite `components/upload/ValidationPreview.tsx`**

```typescript
import type { UploadValidationResult, ActivityUploadResult } from '@/types'

type Props =
  | { mode: 'legacy';   result: UploadValidationResult }
  | { mode: 'activity'; result: ActivityUploadResult }

export function ValidationPreview(props: Props) {
  const errors = props.result.errors

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            {errors.length} أخطاء في الملف
          </p>
          <ul className="text-xs text-red-600 space-y-1">
            {errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
      )}

      {props.mode === 'activity' && props.result.rows.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">
            {props.result.rows.length} نشاط جاهز للاستيراد
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-right p-2 border">الوحدة التنظيمية</th>
                <th className="text-right p-2 border">الأنشطة</th>
                <th className="text-right p-2 border">الفئة</th>
                <th className="text-right p-2 border">2025</th>
                <th className="text-right p-2 border">المستهدف 2026</th>
                <th className="text-right p-2 border">Q1 2026</th>
              </tr>
            </thead>
            <tbody>
              {props.result.rows.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border font-cairo">{row.pillar}</td>
                  <td className="p-2 border font-cairo">{row.nameAr}</td>
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

      {props.mode === 'legacy' && props.result.valid.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">
            {props.result.valid.length} سجل جاهز للاستيراد
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
              {props.result.valid.map((row, i) => (
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

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload/ValidationPreview.tsx
git commit -m "feat: format-aware ValidationPreview for activity and legacy uploads"
```

---

## Task 5: Update `FileUploader` to handle activity responses

**Files:**
- Modify: `components/upload/FileUploader.tsx`

- [ ] **Step 1: Rewrite `components/upload/FileUploader.tsx`**

```typescript
'use client'

import { useState, useRef } from 'react'
import { ValidationPreview } from './ValidationPreview'
import type { UploadValidationResult, ActivityUploadResult } from '@/types'

type PreviewState =
  | { mode: 'activity'; result: ActivityUploadResult }
  | { mode: 'legacy';   result: UploadValidationResult }

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleFile(file: File) {
    setActiveFile(file)
    setStatus('loading')
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dryRun', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()

      if ('rows' in body) {
        setPreview({ mode: 'activity', result: body })
      } else {
        setPreview({ mode: 'legacy', result: body })
      }
      setStatus('idle')
    } catch {
      setMessage('خطأ في الاتصال بالخادم')
      setStatus('error')
    }
  }

  async function handleCommit() {
    if (!activeFile) return
    setStatus('loading')

    try {
      const formData = new FormData()
      formData.append('file', activeFile)
      formData.append('dryRun', 'false')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()

      if ('created' in body) {
        setMessage(`تم إنشاء ${body.created} مؤشر، تحديث ${body.updated} مؤشر`)
      } else {
        setMessage(`تم استيراد ${body.imported} سجل بنجاح`)
      }
      setStatus('done')
      setPreview(null)
    } catch {
      setMessage('خطأ في الاتصال بالخادم')
      setStatus('error')
    }
  }

  const hasRows = preview?.mode === 'activity'
    ? preview.result.rows.length > 0
    : (preview?.result as UploadValidationResult)?.valid?.length > 0

  const hasNoErrors = preview?.result.errors.length === 0

  return (
    <div className="space-y-6">
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
          الأعمدة المتوقعة: الوحدة التنظيمية · الأنشطة · 2025 · المستهدف 2026 · 2026 Q1 · الفئة
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
      {status === 'done'    && <p className="text-sm text-emerald-700 font-medium text-center">{message}</p>}
      {status === 'error'   && <p className="text-sm text-red-700 font-medium text-center">{message}</p>}

      {preview && (
        <>
          <ValidationPreview {...preview} />
          {hasRows && hasNoErrors && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                className="bg-[#0f4024] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0f4024]/90"
              >
                تأكيد الاستيراد
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Test manually**

1. Open http://localhost:3000/upload
2. Drop your Excel file — preview table should show Arabic columns (الوحدة التنظيمية, الأنشطة, الفئة, 2025, المستهدف 2026, Q1 2026)
3. Click "تأكيد الاستيراد" — success message should show "تم إنشاء X مؤشر، تحديث Y مؤشر"
4. Open http://localhost:3000/dashboard — KPI cards should reflect uploaded data

- [ ] **Step 4: Commit**

```bash
git add components/upload/FileUploader.tsx
git commit -m "feat: wire FileUploader to handle activity and legacy upload responses"
```
