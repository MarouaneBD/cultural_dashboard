import 'dotenv/config'
import { PrismaClient, Pillar, KpiUnit, Period } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const YEAR = 2026

// ---------------------------------------------------------------------------
// Seed KPIs — will be expanded once the user provides activity details.
// Add your KPIs here as: { nameAr, pillar, unit, targetAnnual }
// ---------------------------------------------------------------------------
// Real KPIs are uploaded via the file-ingestion layer (/app/upload).
// Add per-department KPIs here once the upload schema is finalized.
const kpis: Array<{ nameAr: string; pillar: Pillar; unit: KpiUnit; targetAnnual: number }> = [
]

async function main() {
  console.log('🌱 Seeding database...')

  for (const k of kpis) {
    const kpi = await prisma.kpiRegistry.upsert({
      where: { nameAr_pillar: { nameAr: k.nameAr, pillar: k.pillar } },
      create: { nameAr: k.nameAr, pillar: k.pillar, unit: k.unit },
      update: {},
    })

    await prisma.target.upsert({
      where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: YEAR } },
      create: { kpiId: kpi.id, period: 'ANNUAL', year: YEAR, value: k.targetAnnual },
      update: { value: k.targetAnnual },
    })

    // Sample quarterly actuals for dev preview
    const actuals = [
      k.targetAnnual * 0.82,
      k.targetAnnual * 0.88,
      k.targetAnnual * 0.93,
      k.targetAnnual * 0.97,
    ]
    const periods: Period[] = ['Q1', 'Q2', 'Q3', 'Q4']

    for (let i = 0; i < 4; i++) {
      await prisma.actual.upsert({
        where: { kpiId_period_year: { kpiId: kpi.id, period: periods[i], year: YEAR } },
        create: { kpiId: kpi.id, period: periods[i], year: YEAR, value: actuals[i] },
        update: { value: actuals[i] },
      })
    }

    console.log(`  ✓ ${k.nameAr}`)
  }

  console.log(`✅ Seeded ${kpis.length} KPIs across 7 departments.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
