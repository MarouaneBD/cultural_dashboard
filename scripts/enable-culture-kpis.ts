import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import type { Pillar } from '@prisma/client'

const CULTURE_RESEARCH: Pillar[] = [
  'EDUCATION', 'FAMILY_CULTURE', 'ISLAMIC_INFO_CENTER',
  'AL_BIRR_MALE', 'AL_BIRR_FEMALE', 'ORPHANS',
  'SCIENTIFIC_PROGRAMS', 'RESEARCH_PUBLICATIONS',
]

async function main() {
  const result = await prisma.kpiRegistry.updateMany({
    where: { pillar: { in: CULTURE_RESEARCH }, unit: 'COUNT' },
    data: { showInDashboard: true },
  })
  console.log(`✅  Enabled showInDashboard for ${result.count} CULTURE_RESEARCH COUNT KPIs`)

  const kpis = await prisma.kpiRegistry.findMany({
    where: { pillar: { in: CULTURE_RESEARCH }, unit: 'COUNT', showInDashboard: true },
    select: { nameAr: true, pillar: true, owner: true },
    orderBy: { nameAr: 'asc' },
  })
  for (const k of kpis) console.log(`  ✓ ${k.pillar.padEnd(20)} ${k.nameAr}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
