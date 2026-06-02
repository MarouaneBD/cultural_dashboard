'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = new FormData(e.currentTarget)
    const newPassword = form.get('newPassword') as string
    const confirm = form.get('confirm') as string

    if (newPassword !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    const res = await fetch('/api/user/change-password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'حدث خطأ')
      return
    }

    // Re-sign in to refresh the JWT (mustChangePassword is now false)
    await signOut({ redirect: false })
    router.push('/login')
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
        <h1 className="text-center font-semibold text-lg mb-2" style={{ color: 'var(--ink)' }}>
          تغيير كلمة المرور
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
          يجب عليك تغيير كلمة المرور قبل المتابعة
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              كلمة المرور الجديدة
            </label>
            <input
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              تأكيد كلمة المرور
            </label>
            <input
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
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
            {loading ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  )
}
