import * as XLSX from 'xlsx'
import { POST } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'EDUCATION' } }),
}))

// Mock prisma + withAuditUser (passthrough — just calls the callback)
jest.mock('@/lib/prisma', () => ({
  withAuditUser: jest.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  prisma: {
    $transaction: jest.fn(async (fn: (_tx: unknown) => Promise<unknown>) => fn({
      kpiRegistry: {
        findUnique: jest.fn().mockResolvedValue(null), // null = new KPI → created++
        upsert: jest.fn().mockResolvedValue({ id: 'kpi-1' }),
      },
      target: {
        findUnique: jest.fn().mockResolvedValue(null), // null = no conflict → live write
        upsert: jest.fn().mockResolvedValue({}),
      },
      actual: {
        findUnique: jest.fn().mockResolvedValue(null), // null = no conflict → live write
        create: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      uploadSubmission: {
        create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      },
    })),
    kpiRegistry: { findMany: jest.fn().mockResolvedValue([]) },
    actual: { create: jest.fn().mockResolvedValue({}) },
    submissionRow: { count: jest.fn().mockResolvedValue(0) },
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
  expect(body.created).toBe(1)
  expect(body.updated).toBe(0)
})
