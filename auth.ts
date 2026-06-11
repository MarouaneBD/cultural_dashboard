import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import { authConfig } from './auth.config'
import type { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'اسم المستخدم' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.error('[auth] authorize called, keys:', Object.keys(credentials ?? {}))
          const username = credentials?.username as string | undefined
          const password = credentials?.password as string | undefined
          if (!username || !password) {
            console.error('[auth] missing credentials — username:', !!username, 'password:', !!password)
            return null
          }

          const user = await prisma.user.findUnique({ where: { username } })
          if (!user) {
            console.error('[auth] user not found:', username)
            return null
          }

          const valid = await verifyPassword(password, user.passwordHash)
          if (!valid) {
            console.error('[auth] password mismatch for:', username)
            return null
          }

          return {
            id: user.id,
            username: user.username,
            name: user.name ?? undefined,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
          }
        } catch (err) {
          console.error('[auth] authorize threw:', err)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
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
})
