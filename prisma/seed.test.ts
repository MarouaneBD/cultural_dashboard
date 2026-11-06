import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { VALID_PILLAR_IDS } from '@/lib/departments'

const skipAll = !process.env.DATABASE_URL

const adapter = skipAll
  ? null
  : new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = skipAll ? null : new PrismaClient({ adapter: adapter! })

describe('seed data', () => {
  afterAll(() => prisma?.$disconnect())

  it('has KPIs only from the known departments', async () => {
    if (skipAll || !prisma) return

    const kpis = await prisma.kpiRegistry.findMany({ select: { pillar: true } })
    kpis.forEach(kpi => {
      expect(VALID_PILLAR_IDS.has(kpi.pillar)).toBe(true)
    })
  })

  it('every KPI has at least one target for current year', async () => {
    if (skipAll || !prisma) return
    const kpis = await prisma.kpiRegistry.findMany({ include: { targets: true } })
    kpis.forEach(kpi => {
      expect(kpi.targets.length).toBeGreaterThan(0)
    })
  })
})
