import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Session-mode pooler (port 5432, no pgbouncer flag) supports schema migrations
    // and avoids direct-DB connectivity issues on restricted networks.
    url: (process.env.SESSION_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL)!,
  },
})
