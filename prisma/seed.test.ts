import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

describe('seed data', () => {
  afterAll(() => prisma.$disconnect())

  it('creates all four pillars as KPI categories', async () => {
    const pillars = await prisma.kpiRegistry.findMany({
      distinct: ['pillar'],
      select: { pillar: true },
    })
    const pillarValues = pillars.map(p => p.pillar).sort()
    expect(pillarValues).toEqual([
      'HOLY_QURAN',
      'ISLAMIC_EDUCATION',
      'TEACHER_SPONSORSHIP',
      'UNIVERSITY_SPONSORSHIP',
    ])
  })

  it('every KPI has at least one target for current year', async () => {
    const kpis = await prisma.kpiRegistry.findMany({ include: { targets: true } })
    kpis.forEach(kpi => {
      expect(kpi.targets.length).toBeGreaterThan(0)
    })
  })
})
