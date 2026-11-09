import { GET } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'u1', role: 'EDITOR', assignedPillarId: 'EDUCATION' },
  }),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'k1', nameAr: 'عدد الطلاب', unit: 'COUNT', activityType: 'CUMULATIVE', pillar: 'EDUCATION' },
      ]),
    },
    actual: { findMany: jest.fn().mockResolvedValue([]) },
    target: { findMany: jest.fn().mockResolvedValue([]) },
    submissionRow: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))

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
