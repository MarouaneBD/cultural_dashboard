import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

describe('seed data', () => {
  afterAll(() => prisma.$disconnect())

  it('has KPIs only from the 7 known departments', async () => {
    const validPillars = new Set([
      'EDUCATION', 'FAMILY_CULTURE', 'ISLAMIC_INFO_CENTER',
      'AL_BIRR_MALE', 'AL_BIRR_FEMALE', 'ORPHANS', 'SCIENTIFIC_PROGRAMS',
    ])
    const kpis = await prisma.kpiRegistry.findMany({ select: { pillar: true } })
    kpis.forEach(kpi => {
      expect(validPillars.has(kpi.pillar)).toBe(true)
    })
  })

  it('every KPI has at least one target for current year', async () => {
    const kpis = await prisma.kpiRegistry.findMany({ include: { targets: true } })
    kpis.forEach(kpi => {
      expect(kpi.targets.length).toBeGreaterThan(0)
    })
  })
})
