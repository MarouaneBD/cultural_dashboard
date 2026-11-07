import * as XLSX from 'xlsx'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()

jest.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

// Build a re-usable tx mock with configurable kpiRegistry.findUnique
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

// Mock parseActivityFile — we'll override it in individual tests
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
  // Default: EDITOR with EDUCATION pillar assignment
  mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'EDUCATION' } })
})

// ── Legacy format must return 400 ────────────────────────────────────────────

function makeLegacyBuffer(): ArrayBuffer {
  // A file with no 'الأنشطة' column — the legacy format detector returns false
  const ws = XLSX.utils.json_to_sheet([{
    kpiId: 'kpi-existing-01',
    period: 'Q1',
    year: 2026,
    value: 85,
  }])
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

// ── Dry-run (no DB writes) ────────────────────────────────────────────────────

it('returns dry-run preview for activity file', async () => {
  mockTx = makeTxMock(null)
  const res = await POST(makeRequest(makeActivityBuffer(), true))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.dryRun).toBe(true)
  expect(body.rows).toHaveLength(1)
  expect(body.rows[0].nameAr).toBe('برامج التعليم')
})

// ── EDITOR scope: novel KPI must be REJECTED ─────────────────────────────────

it('EDITOR: novel KPI is rejected with scope error (not created)', async () => {
  // findUnique returns null → novel KPI
  mockTx = makeTxMock(null)
  const res = await POST(makeRequest(makeActivityBuffer('مؤشر جديد تماماً'), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.created).toBe(0)
  expect(body.updated).toBe(0)
  // Scope error must be present
  expect(body.errors).toHaveLength(1)
  expect(body.errors[0].message).toMatch('لا يمكن للمحرر')
  // upsert must NOT have been called
  expect(mockTx.kpiRegistry.upsert).not.toHaveBeenCalled()
})

// ── EDITOR scope: existing KPI must be UPDATED ───────────────────────────────

it('EDITOR: existing KPI is updated (not blocked)', async () => {
  // findUnique returns an existing KPI
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.updated).toBe(1)
  expect(body.errors).toHaveLength(0)
  // upsert MUST have been called (update path)
  expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
})

// ── ADMIN: novel KPI must be ALLOWED ─────────────────────────────────────────

it('ADMIN: novel KPI is created without scope error', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  // findUnique returns null → novel KPI, but caller is ADMIN
  mockTx = makeTxMock(null)
  const res = await POST(makeRequest(makeActivityBuffer('مؤشر إداري جديد'), false))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.created).toBe(1)
  expect(body.errors).toHaveLength(0)
  // upsert MUST have been called
  expect(mockTx.kpiRegistry.upsert).toHaveBeenCalledTimes(1)
})

// ── EDITOR staging: first-write (no prior row) must be STAGED, not written live ─

it('EDITOR: target with no prior row is staged (oldValue=0), not written to live table', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  // No existing target or actual
  mockTx.target.findUnique.mockResolvedValue(null)
  mockTx.actual.findUnique.mockResolvedValue(null)

  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.queued).toBeGreaterThan(0)
  // Live upsert must NOT have been called for target or actual
  expect(mockTx.target.upsert).not.toHaveBeenCalled()
  expect(mockTx.actual.upsert).not.toHaveBeenCalled()
  // Submission must have been created
  expect(mockTx.uploadSubmission.create).toHaveBeenCalledTimes(1)
  // The staged rows must have oldValue: 0
  const createCall = mockTx.uploadSubmission.create.mock.calls[0][0]
  const stagedRows: Array<{ oldValue: number }> = createCall.data.rows.create
  expect(stagedRows.every(r => r.oldValue === 0)).toBe(true)
})

it('EDITOR: target with existing row is staged with correct oldValue', async () => {
  mockTx = makeTxMock({ id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION' })
  mockTx.target.findUnique.mockResolvedValue({ value: 90 })
  mockTx.actual.findUnique.mockResolvedValue({ value: 75 })

  const res = await POST(makeRequest(makeActivityBuffer(), false))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body.queued).toBeGreaterThan(0)
  expect(mockTx.target.upsert).not.toHaveBeenCalled()
  expect(mockTx.actual.upsert).not.toHaveBeenCalled()
  // At least one staged row must have oldValue: 90 or 75 (from the mocked existing rows)
  const createCall = mockTx.uploadSubmission.create.mock.calls[0][0]
  const stagedRows: Array<{ oldValue: number }> = createCall.data.rows.create
  const oldValues = stagedRows.map(r => r.oldValue)
  expect(oldValues).toContain(90)  // from target.findUnique
})

// ── owner normalization ───────────────────────────────────────────────────────

function makeActivityBufferWithDirtyCategory(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([{
    'الوحدة التنظيمية': 'ادارة التعليم',
    'الأنشطة': 'برامج التعليم',
    '2025': 80,
    'المستهدف 2026': 100,
    '2026 Q1': 85,
    'الفئة': 'تعليم ',   // trailing space
  }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

it('ADMIN: owner is normalized (trimmed) before upsert', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', assignedPillarId: null } })
  mockTx = makeTxMock(null)

  // Mock parseActivityFile to return dirty data (with trailing space) to test write-time normalization
  mockParseActivityFile = jest.fn().mockReturnValue({
    rows: [{
      nameAr: 'برامج التعليم',
      pillar: 'EDUCATION',
      category: 'تعليم ',  // trailing space — not normalized yet
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
  // owner must not have trailing space — normalization must happen at write time
  expect(upsertCall.create.owner).toBe('تعليم')

  // Reset for other tests
  mockParseActivityFile = jest.requireActual('@/lib/excel').parseActivityFile
})
