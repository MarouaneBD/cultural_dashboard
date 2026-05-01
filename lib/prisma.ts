import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL environment variable is not set')

const READ_ACTIONS = new Set(['findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'])
const AUDITED_MODELS = new Set(['Actual', 'KpiRegistry'])

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: url! })
  const base = new PrismaClient({ adapter })

  // Audit extension — logs every mutation on Actual and KpiRegistry
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args)

          if (model && AUDITED_MODELS.has(model) && !READ_ACTIONS.has(operation)) {
            try {
              const typedArgs = args as Record<string, unknown>
              await base.auditLog.create({
                data: {
                  userId: 'system',
                  action: `${model}.${operation}`,
                  kpiId:
                    (typedArgs?.where as Record<string, unknown>)?.id as string | null ??
                    (typedArgs?.data as Record<string, unknown>)?.kpiId as string | null ??
                    null,
                  oldValue: null,
                  newValue: result ? JSON.stringify(result) : null,
                },
              })
            } catch {
              // Never let audit failure break the main operation
            }
          }

          return result
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
