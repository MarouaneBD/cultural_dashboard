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
const kpis: Array<{ nameAr: string; pillar: Pillar; unit: KpiUnit; targetAnnual: number }> = [
  // ادارة التعليم
  { nameAr: 'مؤشر ادارة التعليم (تجريبي)', pillar: 'EDUCATION', unit: 'COUNT', targetAnnual: 100 },

  // ادارة ثقافة الأسرة
  { nameAr: 'مؤشر ثقافة الأسرة (تجريبي)', pillar: 'FAMILY_CULTURE', unit: 'COUNT', targetAnnual: 100 },

  // مركز المعلومات الاسلامي
  { nameAr: 'مؤشر مركز المعلومات (تجريبي)', pillar: 'ISLAMIC_INFO_CENTER', unit: 'COUNT', targetAnnual: 100 },

  // مشروع البر - ذكور
  { nameAr: 'مؤشر البر ذكور (تجريبي)', pillar: 'AL_BIRR_MALE', unit: 'COUNT', targetAnnual: 100 },

  // مشروع البر - اناث
  { nameAr: 'مؤشر البر اناث (تجريبي)', pillar: 'AL_BIRR_FEMALE', unit: 'COUNT', targetAnnual: 100 },

  // قسم الأيتام
  { nameAr: 'مؤشر الأيتام (تجريبي)', pillar: 'ORPHANS', unit: 'COUNT', targetAnnual: 100 },

  // مكتب البرامج العلمية والأيتام
  { nameAr: 'مؤشر البرامج العلمية (تجريبي)', pillar: 'SCIENTIFIC_PROGRAMS', unit: 'COUNT', targetAnnual: 100 },
]

async function main() {
  console.log('🌱 Seeding database...')

  for (const k of kpis) {
    const kpi = await prisma.kpiRegistry.upsert({
      where: { nameAr: k.nameAr },
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
