import { GET, POST } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'EDUCATION' },
  }),
}))

jest.mock('@/lib/prisma', () => {
  const prismaClient = {
    kpiRegistry: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'k1', nameAr: 'عدد الطلاب', unit: 'COUNT', activityType: 'CUMULATIVE', pillar: 'EDUCATION' },
      ]),
    },
    actual: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'a1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    target: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    submissionRow: {
      create: jest.fn().mockResolvedValue({ id: 'sr1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    uploadSubmission: { create: jest.fn().mockResolvedValue({ id: 'sub1' }) },
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaClient)),
  }
  return {
    prisma: prismaClient,
    withAuditUser: jest.fn().mockImplementation((_userId: string, fn: () => unknown) => fn()),
  }
})

// Convenience accessor for prisma mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = () => (jest.requireMock('@/lib/prisma') as any).prisma

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

test('POST /api/entry writes new actual directly', async () => {
  mockPrisma().actual.findUnique.mockResolvedValue(null)
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
  expect(mockPrisma().actual.upsert).toHaveBeenCalled()
})

test('POST /api/entry queues overwrite actual', async () => {
  mockPrisma().actual.findUnique.mockResolvedValue({ id: 'existing', value: 50 })
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
  expect(mockPrisma().submissionRow.create).toHaveBeenCalled()
})

test('POST /api/entry always queues targets', async () => {
  mockPrisma().actual.findUnique.mockResolvedValue(null)
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

test('POST /api/entry returns 400 for invalid period', async () => {
  const req = new NextRequest('http://localhost/api/entry', {
    method: 'POST',
    body: JSON.stringify({
      pillar: 'EDUCATION', period: 'INVALID', year: 2026, tableType: 'ACTUAL',
      rows: [{ kpiId: 'k1', value: 100 }],
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})
