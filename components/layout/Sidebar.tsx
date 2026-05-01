'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PILLARS = [
  { href: '/dashboard?pillar=ISLAMIC_EDUCATION', labelAr: 'التعليم الإسلامي', icon: '🕌' },
  { href: '/dashboard?pillar=HOLY_QURAN', labelAr: 'القرآن الكريم', icon: '📖' },
  { href: '/dashboard?pillar=TEACHER_SPONSORSHIP', labelAr: 'كفالة المعلمين', icon: '👨‍🏫' },
  { href: '/dashboard?pillar=UNIVERSITY_SPONSORSHIP', labelAr: 'المنح الجامعية', icon: '🎓' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-[#0f4024] text-white flex flex-col border-e border-white/10">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-xs text-white/50 mb-1">نظام التقارير التنفيذية</p>
        <h1 className="text-base font-bold leading-tight">شؤون الإسلامية</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Home link — active when pathname is /dashboard (query params are not in pathname) */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            pathname === '/dashboard'
              ? 'bg-white/15 font-semibold'
              : 'hover:bg-white/10'
          }`}
        >
          <span>📊</span>
          <span>الرئيسية</span>
        </Link>

        <div className="pt-3 pb-1 px-3">
          <p className="text-xs text-white/40 font-medium">المحاور الأربعة</p>
        </div>

        {PILLARS.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
          >
            <span>{p.icon}</span>
            <span>{p.labelAr}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link href="/upload" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10">
          <span>⬆️</span>
          <span>رفع البيانات</span>
        </Link>
        <Link href="/admin/audit" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10">
          <span>📋</span>
          <span>سجل المراجعة</span>
        </Link>
      </div>
    </aside>
  )
}
