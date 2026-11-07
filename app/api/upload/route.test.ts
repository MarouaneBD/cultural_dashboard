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
