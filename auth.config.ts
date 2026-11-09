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
        token.username = user.username
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
        token.assignedPillarId = user.assignedPillarId
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.role = token.role as UserRole
      session.user.mustChangePassword = token.mustChangePassword as boolean
      session.user.assignedPillarId = token.assignedPillarId as string | null
      return session
    },
  },
} satisfies NextAuthConfig
