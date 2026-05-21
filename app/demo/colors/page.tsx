'use client'

import { useState } from 'react'
import Image from 'next/image'

const GOLD = '#b8822a'
const LOGO = '/dabs-logo.png'

const NAV_ITEMS = [
  { icon: '◈', label: 'الرئيسية' },
  { icon: '📚', label: 'ادارة التعليم' },
  { icon: '👨‍👩‍👧', label: 'ادارة ثقافة الأسرة' },
  { icon: '🕌', label: 'مركز المعلومات الاسلامي' },
  { icon: '👦', label: 'مشروع البر - ذكور' },
  { icon: '👧', label: 'مشروع البر - اناث' },
  { icon: '🤲', label: 'قسم الأيتام' },
  { icon: '📖', label: 'مكتب البرامج العلمية' },
]

const STATS = [
  { label: 'الإدارات', value: '7', icon: '🏛' },
  { label: 'البرامج', value: '47', icon: '📋' },
  { label: 'الأنشطة', value: '120', icon: '⚡' },
  { label: 'المؤشرات', value: '28', icon: '📊' },
  { label: 'المستفيدون', value: '2,840', icon: '👥' },
  { label: 'نسبة الإنجاز', value: '89%', icon: '✦', gold: true },
]

const OPTIONS = [
  { id: 'current', label: 'الحالي',          sidebar: '#162b1e', banner: '#162b1e', desc: 'اللون الحالي — داكن جداً' },
  { id: 'A',       label: 'A — رفع الداكن',  sidebar: '#1e3d2b', banner: '#1e3d2b', desc: 'نفس التدرج، أكثر إضاءة بنسبة 30%' },
  { id: 'B',       label: 'B — أخضر غابي',  sidebar: '#1a5c38', banner: '#1a5c38', desc: 'أخضر متوسط، واضح وحيوي' },
  { id: 'C',       label: 'C — زمردي عميق', sidebar: '#0f4d3a', banner: '#0f4d3a', desc: 'أخضر أزرقي، راقي وعصري' },
  { id: 'D',       label: 'D — رمادي أخضر', sidebar: '#2c3d35', banner: '#2c3d35', desc: 'مكتوم ومحايد، الذهبي يبرز أكثر' },
  { id: 'E',       label: 'E — ثنائي اللون', sidebar: '#162b1e', banner: '#1e5c38', desc: 'الشريط الجانبي داكن، البانر أفتح' },
]

function MiniSidebar({ color, active }: { color: string; active: number }) {
  return (
    <div style={{ background: color, width: 200, minHeight: 500, borderRadius: '12px 0 0 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {/* Logo area */}
      <div style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '8px 14px', boxShadow: '0 2px 10px rgba(0,0,0,.25)', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Image src={LOGO} alt="logo" width={110} height={36} style={{ maxHeight: 32, width: 'auto', display: 'block' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.88)', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            قطاع الثقافة
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>لوحة تحكم</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.22)', padding: '6px 8px 4px', fontFamily: 'sans-serif' }}>الإدارات</div>
        {NAV_ITEMS.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
            background: i === active ? 'rgba(255,255,255,.12)' : 'transparent',
            color: i === active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.52)',
            fontSize: 11, fontFamily: 'sans-serif', fontWeight: i === active ? 600 : 400,
          }}>
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            <span style={{ fontSize: 11 }}>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}

function MiniBanner({ color }: { color: string }) {
  return (
    <div style={{ background: color, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: GOLD }}>✦</span>
          <span style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: GOLD, fontFamily: 'sans-serif', fontWeight: 600 }}>نظرة عامة على القطاع</span>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace' }}>2026 · ANNUAL</span>
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', gap: 3, textAlign: 'center',
            borderRight: i < 5 ? '1px solid rgba(255,255,255,.06)' : 'none',
          }}>
            <span style={{ fontSize: 13 }}>{s.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: s.gold ? GOLD : 'rgba(255,255,255,.92)', fontFamily: 'sans-serif', letterSpacing: '-.01em' }}>{s.value}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,.35)', fontFamily: 'sans-serif' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Preview({ opt, activeNav }: { opt: typeof OPTIONS[0]; activeNav: number }) {
  return (
    <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.14)', border: '1px solid #e5e3df' }}>
      <MiniSidebar color={opt.sidebar} active={activeNav} />
      <div style={{ flex: 1, background: '#f5f4f1', padding: 14, minWidth: 0 }}>
        {/* Header bar */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 2, background: '#94a3b8', borderRadius: 1 }} />
            <div style={{ width: 10, height: 2, background: '#94a3b8', borderRadius: 1 }} />
            <span style={{ fontSize: 11, fontFamily: 'sans-serif', color: '#1e293b', fontWeight: 600 }}>لوحة تحكم قطاع الثقافة</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Q1','Q2','Q3','Q4'].map(q => (
              <span key={q} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: q === 'Q1' ? '#162b1e' : '#f1f5f9', color: q === 'Q1' ? '#fff' : '#64748b', fontFamily: 'monospace' }}>{q}</span>
            ))}
          </div>
        </div>
        <MiniBanner color={opt.banner} />
        {/* Dept cards placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,.05)', borderTop: `2.5px solid ${i < 2 ? '#16a34a' : i < 4 ? '#d97706' : '#dc2626'}` }}>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginBottom: 5, width: '70%' }} />
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 3, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ColorsDemo() {
  const [selected, setSelected] = useState('current')
  const [activeNav, setActiveNav] = useState(0)
  const opt = OPTIONS.find(o => o.id === selected)!

  return (
    <div style={{ minHeight: '100vh', background: '#f0efec', padding: '40px 32px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>Color Theme Demo</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>اختر لون القطاع</h1>
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Click an option to preview the sidebar and banner live</p>
        </div>

        {/* Option buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                border: `2px solid ${selected === opt.id ? GOLD : '#e2e0db'}`,
                background: selected === opt.id ? '#fffbf0' : '#fff',
                cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                transition: 'all .15s',
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 4, background: opt.id === 'E' ? `linear-gradient(135deg, ${opt.sidebar} 50%, ${opt.banner} 50%)` : opt.sidebar, flexShrink: 0, border: '1px solid rgba(0,0,0,.12)' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{opt.label}</div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>{opt.id === 'current' ? opt.sidebar : `sidebar ${opt.sidebar}`}{opt.id === 'E' ? ` · banner ${opt.banner}` : ''}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Live preview */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{opt.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 8 }}>— {opt.desc}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#94a3b8' }}>
              Click sidebar nav items to test active state →
            </div>
          </div>
          <Preview opt={opt} activeNav={activeNav} />
        </div>

        {/* Nav item clicker */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {NAV_ITEMS.map((item, i) => (
            <button key={i} onClick={() => setActiveNav(i)}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${activeNav === i ? GOLD : '#ddd'}`, background: activeNav === i ? '#fffbf0' : '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{item.icon}</span><span style={{ color: '#334155' }}>{item.label}</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 24 }}>
          Once you pick, I'll update <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>--sidebar-bg</code> in globals.css with one line.
        </p>
      </div>
    </div>
  )
}
