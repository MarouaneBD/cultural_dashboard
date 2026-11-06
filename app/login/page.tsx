'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      // signIn handles CSRF internally — avoids MissingCSRF errors from stale cookies
      const result = await signIn('credentials', { username, password, redirect: false })

      if (result?.ok) {
        // Full browser navigation clears Next.js router cache so the new
        // user's session is picked up immediately on /dashboard.
        window.location.href = '/dashboard'
        return
      }

      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    } catch (err) {
      console.error('[login]', err)
      setError('حدث خطأ، يرجى المحاولة مرة أخرى')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-center font-semibold text-lg mb-6" style={{ color: 'var(--ink)' }}>
          تسجيل الدخول
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              اسم المستخدم
            </label>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              كلمة المرور
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {isPending ? 'جارٍ التحقق…' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
