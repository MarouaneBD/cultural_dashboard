'use client'

import { useState, FormEvent } from 'react'
import { signInAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const username = form.get('username') as string
    const password = form.get('password') as string

    const result = await signInAction(username, password)
    if (result) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      setLoading(false)
    }
    // no result = redirect in progress — do nothing
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
              style={{
                background: 'var(--bg-alt)',
                borderColor: 'var(--border)',
                color: 'var(--ink)',
              }}
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
              style={{
                background: 'var(--bg-alt)',
                borderColor: 'var(--border)',
                color: 'var(--ink)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'جارٍ التحقق…' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
