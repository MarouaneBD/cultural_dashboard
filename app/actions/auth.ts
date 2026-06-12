'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    // Pass FormData directly — the canonical NextAuth v5 credentials pattern.
    // Using a plain object { username, password } is unreliable in beta.31.
    await signIn('credentials', formData)
    return null // success — Next.js handles the redirect
  } catch (err) {
    if (err instanceof AuthError) return 'invalid'
    throw err // NEXT_REDIRECT must propagate so Next.js navigates
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
