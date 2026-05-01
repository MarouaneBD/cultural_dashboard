import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })
  return new PrismaClient({ adapter })
}

// Prevent multiple instances in development (hot reload)
declare global {
  // eslint-disable-next-line no-var
  var _prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalThis._prisma ??= createPrismaClient())
