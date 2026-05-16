import * as XLSX from 'xlsx'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
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
  expect(body.created).toBe(1)
  expect(body.updated).toBe(0)
})
