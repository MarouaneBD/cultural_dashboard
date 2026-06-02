import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env')
  }

  const adapter = new PrismaPg({ connectionString: url })
  const prisma = new PrismaClient({ adapter })

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.upsert({
      where: { username },
      update: { passwordHash, role: 'ADMIN', mustChangePassword: false },
      create: { username, passwordHash, role: 'ADMIN', mustChangePassword: false },
    })
    console.log(`✓ Admin seeded: ${user.username} (id: ${user.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
