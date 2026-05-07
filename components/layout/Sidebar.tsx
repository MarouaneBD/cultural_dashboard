'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const PILLARS = [
  { href: '/dashboard?pillar=ISLAMIC_EDUCATION',      labelAr: 'التعليم الإسلامي', icon: '🕌' },
  { href: '/dashboard?pillar=HOLY_QURAN',             labelAr: 'القرآن الكريم',    icon: '📖' },
  { href: '/dashboard?pillar=TEACHER_SPONSORSHIP',    labelAr: 'كفالة المعلمين',   icon: '👨‍🏫' },
  { href: '/dashboard?pillar=UNIVERSITY_SPONSORSHIP', labelAr: 'المنح الجامعية',   icon: '🎓' },
] as const

const FOOTER_LINKS = [
  { href: '/upload',       labelAr: 'رفع البيانات', icon: '⬆' },
  { href: '/admin/audit',  labelAr: 'سجل المراجعة', icon: '📋' },
] as const

// Place your logo file at public/logo.png (or .svg)
const LOGO_PATH = '/logo.png'

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transition: 'transform .2s', transform: collapsed ? 'rotate(180deg)' : 'none' }}
    >
      {/* chevron pointing left (collapse direction) */}
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const logoExists = true // flip to false if no logo file yet

  return (
    <aside
      aria-label="الشريط الجانبي"
      className="min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0"
      style={{
        background: 'var(--sidebar-bg)',
        width: collapsed ? '56px' : '240px',
        transition: 'width .2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center border-b border-white/[.07] flex-shrink-0"
        style={{ padding: collapsed ? '16px 12px' : '16px 16px', gap: '10px', minHeight: '64px' }}
      >
        {/* Logo / icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[.12]"
          style={{ background: 'rgba(255,255,255,.08)' }}
        >
          {logoExists ? (
            <Image
              src={LOGO_PATH}
              alt="شعار المنظمة"
              width={28}
              height={28}
              className="rounded-md object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="font-space font-bold text-[11px] text-white/90">ث</span>
          )}
        </div>

        {/* Text — hidden when collapsed */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div
              className="font-space font-semibold text-[13px] text-white/90 flex items-center gap-1.5 truncate"
            >
              قطاع الثقافة
              <span
                className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{ background: 'var(--gold)' }}
              />
            </div>
            <div className="text-[10px] text-white/40 mt-0.5 truncate">
              لوحة تحكم قطاع الثقافة
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto" style={{ padding: collapsed ? '12px 8px' : '12px 10px' }} aria-label="القائمة الرئيسية">
        <NavLink
          href="/dashboard"
          icon="◈"
          label="الرئيسية"
          active={pathname === '/dashboard'}
          collapsed={collapsed}
        />

        {!collapsed && (
          <p
            className="font-space font-semibold tracking-[.12em] uppercase text-[9.5px] px-2 pt-3 pb-1"
            style={{ color: 'rgba(255,255,255,.25)' }}
          >
            المحاور
          </p>
        )}

        {collapsed && <div className="my-1.5 border-t border-white/[.07]" />}

        {PILLARS.map(p => (
          <NavLink
            key={p.href}
            href={p.href}
            icon={p.icon}
            label={p.labelAr}
            active={pathname?.startsWith(p.href.split('?')[0]) ?? false}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer links */}
      <div
        className="border-t border-white/[.06] flex flex-col gap-0.5 flex-shrink-0"
        style={{ padding: collapsed ? '10px 8px' : '10px 10px' }}
      >
        {FOOTER_LINKS.map(l => (
          <NavLink
            key={l.href}
            href={l.href}
            icon={l.icon}
            label={l.labelAr}
            active={false}
            collapsed={collapsed}
          />
        ))}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
          className="flex items-center justify-center mt-1 rounded-lg transition-colors"
          style={{
            height: '32px',
            color: 'rgba(255,255,255,.35)',
            background: 'transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>
    </aside>
  )
}

interface NavLinkProps {
  href: string
  icon: string
  label: string
  active: boolean
  collapsed: boolean
}

function NavLink({ href, icon, label, active, collapsed }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className="flex items-center rounded-lg text-[12.5px] transition-colors"
      style={{
        gap: collapsed ? '0' : '10px',
        padding: collapsed ? '8px 0' : '8px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.58)',
        background: active ? 'rgba(255,255,255,.10)' : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.06)'
        if (!active) e.currentTarget.style.color = 'rgba(255,255,255,.85)'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent'
        if (!active) e.currentTarget.style.color = 'rgba(255,255,255,.58)'
      }}
    >
      <span style={{ fontSize: '14px', opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
