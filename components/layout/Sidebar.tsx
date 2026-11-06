'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useEffect } from 'react'
import { LogOut, Upload, ListChecks, ClipboardList, Users, type LucideIcon } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { DEPARTMENTS } from '@/lib/departments'
import { DIVISIONS, DIVISION_MAP, DEFAULT_DIVISION, type DivisionId } from '@/lib/divisions'

function pillarsForDivision(divisionId: DivisionId) {
  return DEPARTMENTS
    .filter(d => d.division === divisionId)
    .map(d => ({ id: d.id, href: `/dashboard?pillar=${d.id}&division=${divisionId}`, labelAr: d.labelAr, icon: d.icon }))
}

const LOGO_PATH = '/dabs-logo.png'

const WIDTH_EXPANDED = '210px'
const WIDTH_COLLAPSED = '60px'

interface SidebarProps {
  expanded: boolean
  onNavigate?: () => void
}

export function Sidebar({ expanded, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activePillar = searchParams.get('pillar')
  const activeDivision = (searchParams.get('division') ?? DEFAULT_DIVISION) as DivisionId
  const { data: session, status } = useSession()

  // Close the sidebar whenever the route actually changes (after navigation completes)
  const prevRouteRef = useRef(pathname + searchParams.toString())
  useEffect(() => {
    const curr = pathname + searchParams.toString()
    if (curr !== prevRouteRef.current) {
      prevRouteRef.current = curr
      onNavigate?.()
    }
  }, [pathname, searchParams, onNavigate])
  const role = status === 'loading' ? undefined : session?.user?.role
  const assignedPillarId = session?.user?.assignedPillarId

  const { data: pendingData, isError: pendingError } = useQuery({
    queryKey: ['admin-pending-count'],
    queryFn: () => fetch('/api/admin/submissions/pending-count').then(r => {
      if (!r.ok) throw new Error(`API ${r.status}`)
      return r.json()
    }),
    enabled: role === 'ADMIN',
    refetchInterval: 30000,
  })
  const pendingBadge: number = pendingError ? 0 : ((pendingData as { count?: number } | undefined)?.count ?? 0)

  // Departments for the active division only; assigned EDITOR sees only their own
  const divisionPillars = pillarsForDivision(activeDivision)
  const visiblePillars = (role === 'EDITOR' && assignedPillarId)
    ? divisionPillars.filter(p => p.id === assignedPillarId)
    : divisionPillars

  return (
    <aside
      aria-label="الشريط الجانبي"
      className={[
        'h-screen md:h-auto md:min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0',
        'fixed inset-y-0 start-0 z-40',
        'md:relative md:inset-auto md:z-auto',
        !expanded ? 'hidden md:flex' : 'flex',
      ].join(' ')}
      style={{
        background: 'var(--sidebar-bg)',
        width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED,
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
        overflowX: 'hidden',
        overflowY: 'hidden',
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
                {DIVISION_MAP[activeDivision]?.shortAr ?? 'الثقافة والبحوث'}
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
              </div>
              <div className="text-[9.5px] text-white/38 mt-0.5">منصة جمعية دار البر</div>
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

      {/* ── User info ────────────────────────────────────── */}
      {session?.user && (
        <div
          className="flex-shrink-0 border-b border-white/[.06] flex items-center overflow-hidden"
          style={{ padding: expanded ? '10px 12px' : '10px 6px', gap: expanded ? '10px' : '0', justifyContent: expanded ? 'flex-start' : 'center' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {session.user.username?.[0]?.toUpperCase() ?? '؟'}
          </div>
          {expanded && (
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold truncate" style={{ color: 'rgba(255,255,255,.92)' }}>
                {session.user.username}
              </span>
              <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,.45)' }}>
                {session.user.role === 'ADMIN' ? 'مدير' : session.user.role === 'EDITOR' ? 'محرر' : 'مشاهد'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav
        className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
        style={{ padding: expanded ? '10px 8px' : '10px 6px' }}
        aria-label="القائمة الرئيسية"
      >
        {/* ── Division switcher ───────────────────── */}
        {expanded ? (
          <p
            className="font-space font-semibold tracking-[.12em] uppercase text-[9px] px-2 pt-1 pb-1"
            style={{ color: 'rgba(255,255,255,.25)', whiteSpace: 'nowrap' }}
          >
            القطاعات
          </p>
        ) : (
          <div className="my-1 mx-1 border-t border-white/[.08]" />
        )}

        {DIVISIONS.map(div => (
          <DivisionLink
            key={div.id}
            divisionId={div.id}
            icon={div.icon}
            label={div.shortAr}
            active={activeDivision === div.id}
            available={div.active}
            expanded={expanded}
            onNavigate={onNavigate}
          />
        ))}

        {visiblePillars.length > 0 && (
          <>
            {expanded ? (
              <p
                className="font-space font-semibold tracking-[.12em] uppercase text-[9px] px-2 pt-2.5 pb-1"
                style={{ color: 'rgba(255,255,255,.25)', whiteSpace: 'nowrap' }}
              >
                الوحدات التنظيمية
              </p>
            ) : (
              <div className="my-1 mx-1 border-t border-white/[.08]" />
            )}

            {visiblePillars.map(p => (
              <NavLink
                key={p.href}
                href={p.href}
                icon={p.icon}
                label={p.labelAr}
                active={activePillar === p.id}
                expanded={expanded}
                onNavigate={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      {/* ── Footer (role-gated) ───────────────────────────── */}
      <div
        className="border-t border-white/[.06] flex flex-col gap-0.5 flex-shrink-0"
        style={{ padding: expanded ? '8px 8px' : '8px 6px' }}
      >
        {(role === 'ADMIN' || role === 'EDITOR') && (
          <NavLink
            href="/upload"
            icon={Upload}
            label="رفع البيانات"
            active={pathname === '/upload'}
            expanded={expanded}
            onNavigate={onNavigate}
          />
        )}
        {role === 'ADMIN' && (
          <>
            <NavLink
              href="/admin/submissions"
              icon={ListChecks}
              label="المراجعات"
              active={pathname === '/admin/submissions' || pathname.startsWith('/admin/submissions/')}
              expanded={expanded}
              onNavigate={onNavigate}
              badge={pendingBadge}
            />
            <NavLink
              href="/admin/audit"
              icon={ClipboardList}
              label="سجل المراجعة"
              active={pathname === '/admin/audit'}
              expanded={expanded}
              onNavigate={onNavigate}
            />
            <NavLink
              href="/admin/users"
              icon={Users}
              label="إدارة المستخدمين"
              active={pathname === '/admin/users'}
              expanded={expanded}
              onNavigate={onNavigate}
            />
          </>
        )}
        <button
          onClick={() => { onNavigate?.(); signOut({ callbackUrl: '/login' }) }}
          title={!expanded ? 'تسجيل الخروج' : undefined}
          className="flex items-center rounded-lg text-[12.5px] transition-colors w-full mt-1"
          style={{
            gap: expanded ? '9px' : '0',
            padding: expanded ? '7px 10px' : '8px 0',
            justifyContent: expanded ? 'flex-start' : 'center',
            color: 'rgba(255,255,255,.78)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,80,80,.12)'
            e.currentTarget.style.color = 'rgba(255,120,120,.95)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,.78)'
          }}
        >
          <LogOut size={16} style={{ width: '20px', flexShrink: 0 }} />
          {expanded && <span className="truncate">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  )
}

interface DivisionLinkProps {
  divisionId: DivisionId
  icon: string
  label: string
  active: boolean
  available: boolean
  expanded: boolean
  onNavigate?: () => void
}

function DivisionLink({ divisionId, icon, label, active, available, expanded, onNavigate }: DivisionLinkProps) {
  const href = `/dashboard?division=${divisionId}`
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? label : undefined}
      className="flex items-center rounded-lg text-[12.5px] transition-colors"
      style={{
        gap: expanded ? '9px' : '0',
        padding: expanded ? '7px 10px' : '8px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.60)',
        background: active ? 'rgba(255,255,255,.10)' : 'transparent',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,.06)'
          e.currentTarget.style.color = 'rgba(255,255,255,.90)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,.60)'
        }
      }}
    >
      <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>
        {icon}
      </span>
      {expanded && (
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{label}</span>
          {!available && (
            <span
              className="font-space text-[8px] tracking-wider rounded px-1 py-0.5 flex-shrink-0"
              style={{ background: 'rgba(184,130,42,.22)', color: 'var(--gold)', letterSpacing: '.08em' }}
            >
              قريباً
            </span>
          )}
        </span>
      )}
    </Link>
  )
}

interface NavLinkProps {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
  expanded: boolean
  onNavigate?: () => void
  badge?: number
}

function NavLink({ href, icon: Icon, label, active, expanded, onNavigate, badge = 0 }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? label : undefined}
      className="flex items-center rounded-lg text-[12.5px] transition-colors"
      style={{
        gap: expanded ? '9px' : '0',
        padding: expanded ? '7px 10px' : '8px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.78)',
        background: active ? 'rgba(255,255,255,.10)' : 'transparent',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,.06)'
          e.currentTarget.style.color = 'rgba(255,255,255,.95)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,.78)'
        }
      }}
    >
      <span className="relative" style={{ width: '20px', textAlign: 'center', flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} strokeWidth={1.75} />
        {!expanded && badge > 0 && (
          <span
            className="absolute -top-1 -end-1 inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ background: '#dc2626', minWidth: '14px', height: '14px' }}
          >
            {badge}
          </span>
        )}
      </span>
      {expanded && (
        <span className="flex items-center gap-2 truncate">
          <span className="truncate">{label}</span>
          {badge > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: '#dc2626', minWidth: '18px', height: '18px', padding: '0 4px' }}
            >
              {badge}
            </span>
          )}
        </span>
      )}
    </Link>
  )
}
