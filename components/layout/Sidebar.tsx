'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const PILLARS = [
  { href: '/dashboard?pillar=ISLAMIC_EDUCATION',      labelAr: 'التعليم الإسلامي', icon: '🕌' },
  { href: '/dashboard?pillar=HOLY_QURAN',             labelAr: 'القرآن الكريم',    icon: '📖' },
  { href: '/dashboard?pillar=TEACHER_SPONSORSHIP',    labelAr: 'كفالة المعلمين',   icon: '👨‍🏫' },
  { href: '/dashboard?pillar=UNIVERSITY_SPONSORSHIP', labelAr: 'المنح الجامعية',   icon: '🎓' },
] as const

const FOOTER_LINKS = [
  { href: '/upload',      labelAr: 'رفع البيانات', icon: '⬆' },
  { href: '/admin/audit', labelAr: 'سجل المراجعة', icon: '📋' },
] as const

// Place your logo at public/dabs-logo.png (or .svg)
const LOGO_PATH = '/dabs-logo.png'

interface SidebarProps {
  open: boolean
}

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      aria-label="الشريط الجانبي"
      aria-hidden={!open}
      className="min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0"
      style={{
        background: 'var(--sidebar-bg)',
        width: open ? '240px' : '0px',
        overflow: 'hidden',
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* ── Brand / Logo ─────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/[.07]" style={{ padding: '20px 18px 16px' }}>
        {/* Logo container — prominent white card */}
        <div
          className="w-full rounded-xl flex items-center justify-center mb-3 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,.95)',
            height: '72px',
            boxShadow: '0 2px 12px rgba(0,0,0,.25)',
          }}
        >
          <Image
            src={LOGO_PATH}
            alt="شعار المنظمة"
            width={160}
            height={60}
            className="object-contain"
            style={{ maxHeight: '56px', width: 'auto' }}
          />
        </div>

        {/* App name + subtitle */}
        <div className="text-center" style={{ minWidth: '204px' }}>
          <div className="font-space font-semibold text-[13px] text-white/90 flex items-center justify-center gap-1.5">
            قطاع الثقافة
            <span
              className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
              style={{ background: 'var(--gold)' }}
            />
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">
            لوحة تحكم قطاع الثقافة
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav
        className="flex-1 flex flex-col gap-0.5 overflow-y-auto"
        style={{ padding: '12px 10px' }}
        aria-label="القائمة الرئيسية"
      >
        <NavLink href="/dashboard" icon="◈" label="الرئيسية" active={pathname === '/dashboard'} />

        <p
          className="font-space font-semibold tracking-[.12em] uppercase text-[9.5px] px-2 pt-3 pb-1"
          style={{ color: 'rgba(255,255,255,.25)' }}
        >
          المحاور
        </p>

        {PILLARS.map(p => (
          <NavLink
            key={p.href}
            href={p.href}
            icon={p.icon}
            label={p.labelAr}
            active={pathname?.startsWith(p.href.split('?')[0]) ?? false}
          />
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div
        className="border-t border-white/[.06] flex flex-col gap-0.5 flex-shrink-0"
        style={{ padding: '10px 10px' }}
      >
        {FOOTER_LINKS.map(l => (
          <NavLink key={l.href} href={l.href} icon={l.icon} label={l.labelAr} active={false} />
        ))}
      </div>
    </aside>
  )
}

interface NavLinkProps {
  href: string
  icon: string
  label: string
  active: boolean
}

function NavLink({ href, icon, label, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-2.5 rounded-lg text-[12.5px] transition-colors whitespace-nowrap"
      style={{
        padding: '8px 10px',
        color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.58)',
        background: active ? 'rgba(255,255,255,.10)' : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,.06)'
          e.currentTarget.style.color = 'rgba(255,255,255,.85)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,.58)'
        }
      }}
    >
      <span style={{ fontSize: '14px', opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
