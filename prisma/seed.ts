import 'dotenv/config'
import { PrismaClient, Pillar, KpiUnit, Period } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const YEAR = 2026

const kpis: Array<{ nameAr: string; pillar: Pillar; unit: KpiUnit; targetAnnual: number }> = [
  { nameAr: 'عدد المراكز الإسلامية', pillar: 'ISLAMIC_EDUCATION', unit: 'COUNT', targetAnnual: 120 },
  { nameAr: 'معدل إتمام المناهج', pillar: 'ISLAMIC_EDUCATION', unit: 'PERCENT', targetAnnual: 100 },
  { nameAr: 'حجم طباعة المصاحف', pillar: 'HOLY_QURAN', unit: 'COUNT', targetAnnual: 500000 },
  { nameAr: 'مسابقات التلاوة', pillar: 'HOLY_QURAN', unit: 'COUNT', targetAnnual: 20 },
  { nameAr: 'كفالات المعلمين النشطة', pillar: 'TEACHER_SPONSORSHIP', unit: 'COUNT', targetAnnual: 300 },
  { nameAr: 'ساعات التدريب', pillar: 'TEACHER_SPONSORSHIP', unit: 'COUNT', targetAnnual: 4800 },
  { nameAr: 'المنح الجامعية النشطة', pillar: 'UNIVERSITY_SPONSORSHIP', unit: 'COUNT', targetAnnual: 150 },
  { nameAr: 'معدل التخرج', pillar: 'UNIVERSITY_SPONSORSHIP', unit: 'PERCENT', targetAnnual: 100 },
]

async function main() {
  for (const k of kpis) {
    // Atomic upsert by nameAr (unique)
    const kpi = await prisma.kpiRegistry.upsert({
      where: { nameAr: k.nameAr },
      create: { nameAr: k.nameAr, pillar: k.pillar, unit: k.unit },
      update: {},
    })

    // Upsert annual target
    await prisma.target.upsert({
      where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: YEAR } },
      create: { kpiId: kpi.id, period: 'ANNUAL', year: YEAR, value: k.targetAnnual },
      update: { value: k.targetAnnual },
    })

    // Seed sample actuals for Q1–Q4
    const actuals = [
      k.targetAnnual * 0.82,
      k.targetAnnual * 0.88,
      k.targetAnnual * 0.93,
      k.targetAnnual * 0.97,
    ]
    const periods: Period[] = ['Q1', 'Q2', 'Q3', 'Q4']

    for (let i = 0; i < 4; i++) {
      const period = periods[i]
      await prisma.actual.upsert({
        where: { kpiId_period_year: { kpiId: kpi.id, period, year: YEAR } },
        create: { kpiId: kpi.id, period, year: YEAR, value: actuals[i] },
        update: { value: actuals[i] },
      })
    }
  }
  console.log('Seed complete')
}

main().finally(() => prisma.$disconnect())
