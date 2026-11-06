'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const username = (e.currentTarget.elements.namedItem('username') as HTMLInputElement).value.trim()

    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })

    // Always show success — don't leak whether the username exists
    setStatus('done')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8 space-y-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div>
          <h1 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>
            إعادة تعيين كلمة المرور
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>
            أدخل اسم المستخدم وسيتواصل معك المسؤول بكلمة مرور مؤقتة
          </p>
        </div>

        {status === 'done' ? (
          <div className="space-y-4">
            <div
              className="rounded-xl border p-4 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              <p className="font-medium mb-1">تم استلام طلبك</p>
              <p style={{ color: 'var(--ink-muted)' }}>
                سيقوم المسؤول بمراجعة طلبك وإرسال كلمة مرور مؤقتة إليك في أقرب وقت.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center text-sm"
              style={{ color: 'var(--accent)' }}
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                اسم المستخدم
              </label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {status === 'loading' ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
            </button>

            <Link
              href="/login"
              className="block text-center text-xs"
              style={{ color: 'var(--ink-muted)' }}
            >
              العودة إلى تسجيل الدخول
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
