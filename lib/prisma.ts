import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const AUDITED_MODELS = new Set(['Actual', 'KpiRegistry'])
const WRITE_OPS = new Set(['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'])

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL environment variable is not set')
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } })
  const base = new PrismaClient({ adapter })

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!AUDITED_MODELS.has(model) || !WRITE_OPS.has(operation)) {
            return query(args)
          }

          // Capture old value for single-record updates
          let oldValue: string | null = null
          if (operation === 'update' && (args as any)?.where) {
            try {
              const modelKey = model.charAt(0).toLowerCase() + model.slice(1)
              const before = await (base as any)[modelKey].findUnique({
                where: (args as any).where,
              })
              oldValue = before ? JSON.stringify(before) : null
            } catch {
              // swallow — audit must not break the main operation
            }
          }

          const result = await query(args)

          try {
            const typedArgs = args as Record<string, unknown>
            await (base as any).auditLog.create({
              data: {
                userId: 'system',
                action: `${model}.${operation}`,
                kpiId:
                  (typedArgs?.where as Record<string, unknown>)?.id as string | null ??
                  (typedArgs?.data as Record<string, unknown>)?.kpiId as string | null ??
                  null,
                oldValue,
                newValue: result ? JSON.stringify(result) : null,
              },
            })
          } catch {
            // Never let audit failure break the main operation
          }

          return result
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

// Lazy singleton — client is NOT created at import time.
// This prevents build-time failures when DATABASE_URL isn't available
// during Next.js static analysis (Vercel build phase).
const g = globalThis as unknown as { _prisma?: ExtendedPrismaClient }

function getClient(): ExtendedPrismaClient {
  if (!g._prisma) g._prisma = createPrismaClient()
  return g._prisma
}

export const prisma = new Proxy({} as ExtendedPrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
