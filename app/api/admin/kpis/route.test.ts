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
  showInDashboard: false,
}

jest.mock('@/lib/prisma', () => ({
  withAuditUser: jest.fn((_id: string, fn: () => Promise<unknown>) => fn()),
  prisma: {
    kpiRegistry: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
  },
}))

// Access the mocked prisma after jest.mock hoisting
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockPrisma = (jest.requireMock('@/lib/prisma') as { prisma: typeof import('@/lib/prisma').prisma }).prisma as unknown as {
  kpiRegistry: {
    findUnique: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
  }
}

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

// ── GET: showInDashboard ──────────────────────────────────────────────────────

describe('GET: returns showInDashboard field', () => {
  it('includes showInDashboard false in response', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue({ ...mockKpi, showInDashboard: false })
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1')
    const res = await GET(req, makeParams('kpi-1'))
    const body = await res.json()
    expect(body.showInDashboard).toBe(false)
  })

  it('includes showInDashboard true in response', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue({ ...mockKpi, showInDashboard: true })
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1')
    const res = await GET(req, makeParams('kpi-1'))
    const body = await res.json()
    expect(body.showInDashboard).toBe(true)
  })
})

// ── PATCH: showInDashboard ────────────────────────────────────────────────────

describe('PATCH: showInDashboard field', () => {
  it('updates showInDashboard to true', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue(mockKpi)
    mockPrisma.kpiRegistry.update.mockResolvedValue({ ...mockKpi, showInDashboard: true })
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
      method: 'PATCH',
      body: JSON.stringify({ showInDashboard: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('kpi-1'))
    expect(res.status).toBe(200)
    const updateCall = mockPrisma.kpiRegistry.update.mock.calls[0][0]
    expect(updateCall.data.showInDashboard).toBe(true)
  })

  it('returns 400 when only showInDashboard=undefined and nothing else', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'ADMIN', id: 'u1' } })
    mockPrisma.kpiRegistry.findUnique.mockResolvedValue(mockKpi)
    const req = new NextRequest('http://localhost/api/admin/kpis/kpi-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('kpi-1'))
    expect(res.status).toBe(400)
  })
})
