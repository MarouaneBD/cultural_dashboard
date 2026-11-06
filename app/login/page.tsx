'use client'

import { useState, FormEvent, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const GREEN = '#0f4024'
const GOLD  = '#b8822a'

// ─── Islamic geometric star pattern ──────────────────────────────────────────
// 8-pointed star tile (80×80). Points computed at center (40,40),
// outer radius 24, inner radius 10, alternating at 45° intervals.
const STAR_POINTS =
  '64,40 49.24,36.17 56.97,23.03 43.83,30.76 ' +
  '40,16 36.17,30.76 23.03,23.03 30.76,36.17 ' +
  '16,40 30.76,43.83 23.03,56.97 36.17,49.24 ' +
  '40,64 43.83,49.24 56.97,56.97 49.24,43.83'

function IslamicPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="islamic-star"
          x="0" y="0" width="80" height="80"
          patternUnits="userSpaceOnUse"
        >
          {/* 8-pointed star fill */}
          <polygon
            points={STAR_POINTS}
            fill={`rgba(184,130,42,0.07)`}
            stroke={`rgba(184,130,42,0.22)`}
            strokeWidth="0.9"
          />
          {/* Inner rotated square */}
          <rect
            x="34" y="34" width="12" height="12"
            transform="rotate(45 40 40)"
            fill="none"
            stroke={`rgba(184,130,42,0.12)`}
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamic-star)" />
    </svg>
  )
}

// Gold L-frame corner ornament ─────────────────────────────────────────────
function CornerOrnament({ position }: { position: 'tl' | 'br' }) {
  const isTL = position === 'tl'
  const x1 = isTL ? 0  : 128
  const y1 = isTL ? 0  : 128
  const x2 = isTL ? 56 : 72
  const y2 = isTL ? 56 : 72
  const path = isTL
    ? `M${x2},${y1} L${x1},${y1} L${x1},${y2}`
    : `M${x2},${y1} L${x1},${y1} L${x1},${y2}`
  const starCX = isTL ? 56 : 72
  const starCY = isTL ? 56 : 72

  return (
    <svg
      className={`absolute w-28 h-28 pointer-events-none ${isTL ? 'top-0 left-0' : 'bottom-0 right-0'}`}
      viewBox="0 0 128 128"
      aria-hidden="true"
    >
      {/* L-frame border lines */}
      <path
        d={path}
        fill="none"
        stroke={`rgba(184,130,42,0.35)`}
        strokeWidth="1.5"
      />
      {/* Small 8-pointed star at the corner bend */}
      <polygon
        points={buildStarPoints(starCX, starCY, 10, 4.2)}
        fill="none"
        stroke={`rgba(184,130,42,0.4)`}
        strokeWidth="0.8"
      />
    </svg>
  )
}

function buildStarPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner
    const angle = (i * 22.5 - 90) * (Math.PI / 180)
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
}

// ─── Left decorative panel ────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="relative hidden md:flex flex-col items-center justify-center overflow-hidden"
      style={{ background: GREEN, minHeight: '100vh' }}
    >
      <IslamicPattern />
      <CornerOrnament position="tl" />
      <CornerOrnament position="br" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-10 text-center">

        {/* Logo on white card */}
        <div
          className="rounded-2xl px-7 py-4 shadow-lg"
          style={{ background: 'rgba(255,255,255,0.97)' }}
        >
          <Image
            src="/dabs-logo.png"
            alt="شعار دار البر"
            width={160}
            height={214}
            priority
            style={{ maxHeight: '72px', width: 'auto', display: 'block' }}
          />
        </div>

        {/* Gold rule */}
        <div
          className="rounded-full"
          style={{ width: '48px', height: '2px', background: GOLD }}
        />

        {/* App name */}
        <div className="space-y-2">
          <h1
            className="font-cairo font-bold text-[22px] leading-snug"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            منصة جمعية دار البر
          </h1>
          <p
            className="text-[11px] tracking-[.14em] uppercase"
            style={{ fontFamily: 'var(--font-space)', color: GOLD }}
          >
            Islamic Affairs Division
          </p>
        </div>

        {/* Thin gold rule */}
        <div style={{ width: '28px', height: '1px', background: `rgba(184,130,42,0.4)` }} />

        {/* Tagline */}
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '180px' }}
        >
          نظام تقارير الأداء التنفيذي
        </p>
      </div>
    </div>
  )
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : null
  )
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    try {
      await signIn('credentials', { username, password, callbackUrl: '/dashboard' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NEXT_REDIRECT') || msg.includes('redirect')) return
      console.error('[login]', err)
      setError('حدث خطأ، يرجى المحاولة مرة أخرى')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 py-12"
      style={{ background: 'var(--bg)' }}
    >
      {/* Mobile-only identity header */}
      <div className="md:hidden flex flex-col items-center gap-3 mb-8">
        <div className="rounded-xl px-5 py-3 shadow" style={{ background: GREEN }}>
          <Image
            src="/dabs-logo.png"
            alt="شعار دار البر"
            width={100}
            height={134}
            priority
            style={{ maxHeight: '48px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <p className="font-cairo font-bold text-sm text-center" style={{ color: 'var(--ink)' }}>
          منصة جمعية دار البر
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <h2 className="font-cairo font-bold text-xl" style={{ color: 'var(--ink)' }}>
            تسجيل الدخول
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>
            أدخل بيانات حسابك للمتابعة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
              اسم المستخدم
            </label>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
              كلمة المرور
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          {error && (
            <p
              className="text-sm text-center rounded-lg py-2 px-3"
              style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60 mt-1"
            style={{ background: 'var(--accent)' }}
          >
            {isPending ? 'جارٍ التحقق…' : 'دخول'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
          <Link href="/forgot-password" style={{ color: 'var(--accent)' }}>
            نسيت كلمة المرور؟
          </Link>
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <Suspense>
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-[45fr_55fr]">
        <LeftPanel />
        <LoginForm />
      </div>
    </Suspense>
  )
}
