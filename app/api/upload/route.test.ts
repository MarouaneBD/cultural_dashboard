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
    submissionRow: { count: jest.fn().mockResolvedValue(0) },
  },
}))

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
