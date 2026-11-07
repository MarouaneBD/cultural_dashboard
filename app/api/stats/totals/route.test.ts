import { GET } from '@/app/api/stats/totals/route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({ auth: (...args: unknown[]) => mockAuth(...args) }))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn(),
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { kpiRegistry: { findMany: jest.Mock } }
}

function makeReq(params: Record<string, string>) {
  const url = new URL('http://localhost/api/stats/totals')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { role: 'ADMIN' } })
})

describe('GET /api/stats/totals', () => {
  it('returns 400 when division param is missing', async () => {
    const res = await GET(makeReq({ year: '2025', period: 'ANNUAL' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when division is unknown', async () => {
    const res = await GET(makeReq({ year: '2025', period: 'ANNUAL', division: 'UNKNOWN_DIV' }))
    expect(res.status).toBe(400)
  })

  it('filters KPIs by showInDashboard=true and division pillars', async () => {
    mockPrisma.kpiRegistry.findMany.mockResolvedValue([])
    await GET(makeReq({ year: '2025', period: 'ANNUAL', division: 'CULTURE_RESEARCH' }))
    const whereClause = mockPrisma.kpiRegistry.findMany.mock.calls[0][0].where
    expect(whereClause.showInDashboard).toBe(true)
    // CULTURE_RESEARCH pillars
    expect(whereClause.pillar.in).toEqual(expect.arrayContaining([
      'EDUCATION', 'FAMILY_CULTURE', 'ISLAMIC_INFO_CENTER',
      'AL_BIRR_MALE', 'AL_BIRR_FEMALE', 'ORPHANS',
      'SCIENTIFIC_PROGRAMS', 'RESEARCH_PUBLICATIONS',
    ]))
    expect(whereClause.pillar.in).toHaveLength(8)
  })

  it('filters INSTITUTIONAL_SUPPORT pillars correctly', async () => {
    mockPrisma.kpiRegistry.findMany.mockResolvedValue([])
    await GET(makeReq({ year: '2025', period: 'ANNUAL', division: 'INSTITUTIONAL_SUPPORT' }))
    const whereClause = mockPrisma.kpiRegistry.findMany.mock.calls[0][0].where
    expect(whereClause.pillar.in).toEqual(expect.arrayContaining([
      'HR_MANAGEMENT', 'ADMIN_AFFAIRS', 'PROCUREMENT',
    ]))
    expect(whereClause.pillar.in).toHaveLength(3)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeReq({ division: 'CULTURE_RESEARCH' }))
    expect(res.status).toBe(401)
  })
})
