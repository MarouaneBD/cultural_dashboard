import type { NextAuthConfig } from 'next-auth'

// Edge-compatible config — NO Prisma, NO bcrypt, NO Node.js-only modules.
// Used by middleware.ts only.
export const authConfig = {
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
  },
} satisfies NextAuthConfig
