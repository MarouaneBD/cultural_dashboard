'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PILLARS = [
  { href: '/dashboard?pillar=ISLAMIC_EDUCATION',      labelAr: 'التعليم الإسلامي', icon: '🕌' },
  { href: '/dashboard?pillar=HOLY_QURAN',             labelAr: 'القرآن الكريم',    icon: '📖' },
  { href: '/dashboard?pillar=TEACHER_SPONSORSHIP',    labelAr: 'كفالة المعلمين',   icon: '👨‍🏫' },
  { href: '/dashboard?pillar=UNIVERSITY_SPONSORSHIP', labelAr: 'المنح الجامعية',   icon: '🎓' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 min-h-screen flex flex-col border-e border-white/[.06]"
      style={{ background: 'var(--sidebar-bg)' }}
      aria-label="الشريط الجانبي"
    >
      {/* Brand */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[.07]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[.12]"
          style={{ background: 'rgba(255,255,255,.08)' }}
        >
          <span className="font-space font-bold text-[13px] text-white/90">ERS</span>
        </div>
        <div>
          <div className="font-space font-semibold text-[13px] text-white/90 flex items-center gap-1.5">
            شؤون الإسلامية
            <span
              className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
              style={{ background: 'var(--gold)' }}
            />
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">نظام التقارير التنفيذية</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5" aria-label="القائمة الرئيسية">
        <Link
          href="/dashboard"
          aria-current={pathname === '/dashboard' ? 'page' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] transition-colors ${
            pathname === '/dashboard'
              ? 'text-white/95 font-semibold'
              : 'text-white/60 hover:text-white/85 hover:bg-white/[.06]'
          }`}
          style={pathname === '/dashboard' ? { background: 'rgba(255,255,255,.10)' } : {}}
        >
          <span className="text-[13px] opacity-80">◈</span>
          الرئيسية
        </Link>

        <p
          className="font-space font-semibold tracking-[.12em] uppercase text-[9.5px] px-2.5 pt-3 pb-1"
          style={{ color: 'rgba(255,255,255,.25)' }}
        >
          المحاور
        </p>

        {PILLARS.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-white/60 hover:text-white/85 hover:bg-white/[.06] transition-colors"
          >
            <span className="text-[13px] opacity-70">{p.icon}</span>
            {p.labelAr}
          </Link>
        ))}
      </nav>

      {/* Footer links */}
      <div className="px-2.5 py-2.5 border-t border-white/[.06] flex flex-col gap-0.5">
        <Link
          href="/upload"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-white/60 hover:text-white/85 hover:bg-white/[.06] transition-colors"
        >
          <span className="text-[13px] opacity-70">⬆</span>
          رفع البيانات
        </Link>
        <Link
          href="/admin/audit"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-white/60 hover:text-white/85 hover:bg-white/[.06] transition-colors"
        >
          <span className="text-[13px] opacity-70">📋</span>
          سجل المراجعة
        </Link>
      </div>
    </aside>
  )
}
