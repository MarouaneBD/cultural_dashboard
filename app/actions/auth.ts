'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(username: string, password: string) {
  console.error('[signInAction] called, username:', username, 'DB_URL set:', !!process.env.DATABASE_URL)
  try {
    await signIn('credentials', { username, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) {
      console.error('[signInAction] AuthError:', err.type, err.message)
      return 'invalid'
    }
    console.error('[signInAction] re-throwing:', (err as any)?.message ?? err)
    throw err
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

