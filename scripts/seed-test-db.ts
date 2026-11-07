import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function seed() {
  await prisma.user.upsert({
    where: { id: 'editor-1' },
    create: { id: 'editor-1', username: 'editor1', name: 'Test Editor', role: 'EDITOR', passwordHash: 'x' },
    update: {}
  })
  await prisma.user.upsert({
    where: { id: 'admin-1' },
    create: { id: 'admin-1', username: 'admin1', name: 'Test Admin', role: 'ADMIN', passwordHash: 'x' },
    update: {}
  })
  await prisma.kpiRegistry.upsert({
    where: { id: 'kpi-existing-01' },
    create: { id: 'kpi-existing-01', nameAr: 'برامج التعليم', pillar: 'EDUCATION', unit: 'COUNT' },
    update: {}
  })
  console.log('Seeded: editor-1, admin-1, kpi-existing-01')
  await prisma.$disconnect()
}
seed().catch(e => { console.error(e); process.exit(1) })
