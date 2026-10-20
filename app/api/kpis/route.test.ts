import { GET } from './route'
import { NextRequest } from 'next/server'

const ALL_KPIS = [
  {
    id: 'k1',
    nameAr: 'عدد المراكز',
    pillar: 'EDUCATION',
    unit: 'COUNT',
    targets: [{ value: 120, period: 'ANNUAL', year: 2026 }],
    actuals: [
      { value: 100, period: 'Q1', year: 2026 },
      { value: 105, period: 'Q2', year: 2026 },
      { value: 110, period: 'Q3', year: 2026 },
      { value: 115, period: 'Q4', year: 2026 },
    ],
  },
]

jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn().mockImplementation((args: { where?: { pillar?: { in?: string[] } } } = {}) => {
        const inFilter = args?.where?.pillar?.in
        if (inFilter) {
          return Promise.resolve(ALL_KPIS.filter(k => inFilter.includes(k.pillar)))
        }
        return Promise.resolve(ALL_KPIS)
      }),
    },
  },
}))

describe('GET /api/kpis', () => {
  it('returns KPIs with computed variance', async () => {
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body[0].variance).toBeDefined()
    expect(body[0].variance.color).toMatch(/green|amber|red|neutral/)
    expect(body[0].sparkline).toHaveLength(4)
  })

  it('uses ANNUAL period by default', async () => {
    const req = new NextRequest('http://localhost/api/kpis')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
  })
})

describe('GET /api/kpis — division filter', () => {
  it('returns static dummy KPIs for INSTITUTIONAL_SUPPORT when DB is empty', async () => {
    // The mock returns a single KPI with pillar EDUCATION (CULTURE_RESEARCH).
    // INSTITUTIONAL_SUPPORT has no DB records, so the route falls back to static data.
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL&division=INSTITUTIONAL_SUPPORT')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    // Static data has 5 + 4 + 4 = 13 KPIs across the 3 INSTITUTIONAL_SUPPORT departments
    expect(body.length).toBeGreaterThan(0)
    // All returned KPIs belong to INSTITUTIONAL_SUPPORT pillars
    const issPillars = new Set(['HR_MANAGEMENT', 'ADMIN_AFFAIRS', 'PROCUREMENT'])
    body.forEach((k: { pillar: string }) => expect(issPillars.has(k.pillar)).toBe(true))
    // Static KPI IDs are prefixed to distinguish them from DB records
    expect(body[0].id).toMatch(/^static-/)
  })

  it('returns DB KPIs for CULTURE_RESEARCH (EDUCATION is in that division)', async () => {
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL&division=CULTURE_RESEARCH')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].pillar).toBe('EDUCATION')
  })

  it('returns all KPIs when no division param is given', async () => {
    const req = new NextRequest('http://localhost/api/kpis?year=2026&period=ANNUAL')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
  })
})
