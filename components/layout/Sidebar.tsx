'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signOutAction } from '@/app/actions/auth'
import { DEPARTMENTS } from '@/lib/departments'

const PILLARS = DEPARTMENTS.map(d => ({
  href: `/dashboard?pillar=${d.id}`,
  labelAr: d.labelAr,
  icon: d.icon,
}))

const LOGO_PATH = '/dabs-logo.png'

const WIDTH_EXPANDED = '210px'
const WIDTH_COLLAPSED = '60px'

interface SidebarProps {
  expanded: boolean
}

export function Sidebar({ expanded }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activePillar = searchParams.get('pillar')
  const { data: session } = useSession()
  const role = session?.user?.role

  return (
    <aside
      aria-label="الشريط الجانبي"
      className={[
        'min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0',
        'fixed inset-y-0 start-0 z-40',
        'md:relative md:inset-auto md:z-auto',
        !expanded ? 'hidden md:flex' : 'flex',
      ].join(' ')}
      style={{
        background: 'var(--sidebar-bg)',
        width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED,
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand / Logo ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b border-white/[.07] flex items-center justify-center overflow-hidden"
        style={{ padding: expanded ? '16px 14px 14px' : '14px 10px', minHeight: '80px' }}
      >
        {expanded ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div
              className="w-full rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: 'rgba(255,255,255,.95)',
                height: '56px',
                boxShadow: '0 2px 10px rgba(0,0,0,.22)',
              }}
            >
              <Image
                src={LOGO_PATH}
                alt="شعار المنظمة"
                width={150}
                height={48}
                className="object-contain"
                style={{ maxHeight: '44px', width: 'auto' }}
              />
            </div>
            <div className="text-center">
              <div className="font-space font-semibold text-[12px] text-white/88 flex items-center justify-center gap-1.5">
                قطاع الثقافة
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
              </div>
              <div className="text-[9.5px] text-white/38 mt-0.5">لوحة تحكم</div>
            </div>
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,.92)',
              boxShadow: '0 1px 6px rgba(0,0,0,.20)',
            }}
          >
            <Image
              src={LOGO_PATH}
              alt="شعار المنظمة"
              width={32}
              height={32}
              className="object-contain"
              style={{ maxHeight: '28px', width: 'auto' }}
            />
          </div>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav
        className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
        style={{ padding: expanded ? '10px 8px' : '10px 6px' }}
        aria-label="القائمة الرئيسية"
      >
        <NavLink
          href="/dashboard"
          icon="◈"
          label="الرئيسية"
          active={pathname === '/dashboard' && !activePillar}
          expanded={expanded}
        />

        {expanded ? (
          <p
            className="font-space font-semibold tracking-[.12em] uppercase text-[9px] px-2 pt-2.5 pb-1"
            style={{ color: 'rgba(255,255,255,.25)', whiteSpace: 'nowrap' }}
          >
            الإدارات
          </p>
        ) : (
          <div className="my-1 mx-1 border-t border-white/[.08]" />
        )}

        {PILLARS.map(p => (
          <NavLink
            key={p.href}
            href={p.href}
            icon={p.icon}
            label={p.labelAr}
            active={activePillar === p.href.split('=')[1]}
            expanded={expanded}
          />
        ))}
      </nav>

      {/* ── Footer (role-gated) ───────────────────────────── */}
      <div
        className="border-t border-white/[.06] flex flex-col gap-0.5 flex-shrink-0"
        style={{ padding: expanded ? '8px 8px' : '8px 6px' }}
      >
        {(role === 'ADMIN' || role === 'EDITOR') && (
          <NavLink
            href="/upload"
            icon="⬆"
            label="رفع البيانات"
            active={pathname === '/upload'}
            expanded={expanded}
          />
        )}
        {role === 'ADMIN' && (
          <>
            <NavLink
              href="/admin/audit"
              icon="📋"
              label="سجل المراجعة"
              active={pathname === '/admin/audit'}
              expanded={expanded}
            />
            <NavLink
              href="/admin/users"
              icon="👥"
              label="إدارة المستخدمين"
              active={pathname === '/admin/users'}
              expanded={expanded}
            />
          </>
        )}
        <button
          onClick={() => signOutAction()}
          title={!expanded ? 'تسجيل الخروج' : undefined}
          className="flex items-center rounded-lg text-[12.5px] transition-colors w-full mt-1"
          style={{
            gap: expanded ? '9px' : '0',
            padding: expanded ? '7px 10px' : '8px 0',
            justifyContent: expanded ? 'flex-start' : 'center',
            color: 'rgba(255,255,255,.45)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,80,80,.12)'
            e.currentTarget.style.color = 'rgba(255,120,120,.9)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,.45)'
          }}
        >
          <span style={{ fontSize: '15px', opacity: 0.75, flexShrink: 0 }}>⏻</span>
          {expanded && <span className="truncate">تسجيل الخروج</span>}
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
  expanded: boolean
}

function NavLink({ href, icon, label, active, expanded }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? label : undefined}
      className="flex items-center rounded-lg text-[12.5px] transition-colors"
      style={{
        gap: expanded ? '9px' : '0',
        padding: expanded ? '7px 10px' : '8px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)',
        background: active ? 'rgba(255,255,255,.10)' : 'transparent',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
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
          e.currentTarget.style.color = 'rgba(255,255,255,.55)'
        }
      }}
    >
      <span style={{ fontSize: '15px', opacity: active ? 1 : 0.75, flexShrink: 0 }}>{icon}</span>
      {expanded && <span className="truncate">{label}</span>}
    </Link>
  )
}
