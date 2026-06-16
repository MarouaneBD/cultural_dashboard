import type { NextAuthConfig } from 'next-auth'
import type { UserRole } from '@prisma/client'

// Edge-compatible config — NO Prisma, NO bcrypt, NO Node.js-only modules.
// Used by middleware.ts only.
export const authConfig = {
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isAuthPage = pathname === '/login' || pathname === '/change-password'
      if (isAuthPage) return true
      return !!auth
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.username = (user as any).username
        token.role = (user as any).role as UserRole
        token.mustChangePassword = (user as any).mustChangePassword as boolean
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.role = token.role as UserRole
      session.user.mustChangePassword = token.mustChangePassword as boolean
      return session
    },
  },
} satisfies NextAuthConfig
