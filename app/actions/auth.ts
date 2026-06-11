'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(username: string, password: string) {
  try {
    await signIn('credentials', { username, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) return 'invalid'
    throw err // redirect throws — must re-throw
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

