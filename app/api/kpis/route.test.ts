import { GET } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    kpiRegistry: {
      findMany: jest.fn().mockResolvedValue([
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
      ]),
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
    expect(body[0].variance.color).toMatch(/green|amber|red/)
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
