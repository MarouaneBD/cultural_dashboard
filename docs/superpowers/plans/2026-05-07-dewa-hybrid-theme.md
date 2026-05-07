# DEWA Hybrid Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the DEWA warm-neutral visual language to the ERS dashboard — dark sidebar (`#162b1e`), warm card-bg KPI cards with 3px colored top-border variance signal, Fraunces display numbers, Space Grotesk UI chrome, JetBrains Mono metrics.

**Architecture:** Pure styling update across 8 files. No schema changes, no new files, no API changes. CSS tokens land first in `globals.css`, then each component is updated in dependency order (tokens → sidebar → shell → cards → narrative). Each task is independently committable.

**Tech Stack:** Next.js 14 · Tailwind CSS v4 · `@theme inline` for font token registration · Google Fonts (Cairo + Space Grotesk + Fraunces + JetBrains Mono)

---

## File Map

| File | What changes |
|------|-------------|
| `app/globals.css` | New @import URL; expanded @theme inline; replace oklch :root with warm hex; expand RTL Foundation :root; body gradient |
| `components/layout/Sidebar.tsx` | New `#162b1e` bg, Space Grotesk brand, gold dot, nav hierarchy |
| `components/layout/AppShell.tsx` | Header bg → `--card-bg`, border → `--border` |
| `components/layout/PeriodControls.tsx` | Pill-style period buttons, JetBrains Mono labels |
| `lib/kpi.ts` | Update `COLOR_CLASSES` values to hex top-border colors |
| `components/kpi/KpiCard.tsx` | card-bg bg, `data-variance` attribute, border-top signal, Fraunces number, JetBrains Mono footer |
| `components/kpi/KpiCard.test.tsx` | Replace 3 bg-class assertions with data-variance assertions |
| `components/narrative/ExecutiveSummary.tsx` | Card-strip wrapper with gold label |

---

## Task 1 — CSS Tokens + Fonts (`app/globals.css`)

**Files:**
- Modify: `app/globals.css`

No new behavior — this is a token-only change. Existing tests will still pass because no component classes change yet.

- [ ] **Step 1: Replace the Google Fonts @import (line 1)**

The current line 1 is:
```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
```

Replace it with:
```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Fraunces:ital,wght@0,300;0,400;0,500;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
```

- [ ] **Step 2: Register the new fonts in `@theme inline` (after `--font-heading`)**

Current `@theme inline` block ends around line 51. Add three lines inside it after `--font-heading: var(--font-sans);`:

```css
  --font-space: 'Space Grotesk', system-ui, sans-serif;
  --font-fraunces: 'Fraunces', serif;
  --font-jb: 'JetBrains Mono', monospace;
```

This registers `font-space`, `font-fraunces`, and `font-jb` as Tailwind utility classes.

- [ ] **Step 3: Replace the Shadcn `:root` block (lines 54–87) with the warm palette**

Delete the entire block from `--background: oklch(1 0 0);` through `--sidebar-ring: oklch(0.708 0 0);` and replace with:

```css
:root {
  --background: #faf9f7;
  --foreground: #23221f;
  --card: #fdfcfa;
  --card-foreground: #23221f;
  --popover: #fdfcfa;
  --popover-foreground: #23221f;
  --primary: #0f4024;
  --primary-foreground: #fdfcfa;
  --secondary: #f4f2ed;
  --secondary-foreground: #23221f;
  --muted: #f4f2ed;
  --muted-foreground: #8a867d;
  --accent: #f4f2ed;
  --accent-foreground: #23221f;
  --destructive: oklch(0.577 0.245 27.325);
  --border: rgba(35,34,31,.10);
  --input: rgba(35,34,31,.10);
  --ring: #0f4024;
  --chart-1: #0f4024;
  --chart-2: #14583a;
  --chart-3: #b8822a;
  --chart-4: #555149;
  --chart-5: #8a867d;
  --radius: 0.625rem;
  --sidebar: #fdfcfa;
  --sidebar-foreground: #23221f;
  --sidebar-primary: #0f4024;
  --sidebar-primary-foreground: #fdfcfa;
  --sidebar-accent: #f4f2ed;
  --sidebar-accent-foreground: #23221f;
  --sidebar-border: rgba(35,34,31,.10);
  --sidebar-ring: #0f4024;
}
```

Leave the `.dark { … }` block (lines 89–121) untouched — dark mode is not in scope.

- [ ] **Step 4: Replace the RTL Foundation `:root` block (lines 136–142)**

Delete the block from `/* ── RTL Foundation … */` through the closing `}` and replace with:

```css
/* ── RTL Foundation ─────────────────────────────────────────── */
:root {
  --font-arabic:      'Cairo', system-ui, sans-serif;
  --bg:               #faf9f7;
  --bg-alt:           #f4f2ed;
  --ink:              #23221f;
  --ink-soft:         #555149;
  --ink-muted:        #8a867d;
  --card-bg:          #fdfcfa;
  --hair:             rgba(35,34,31,.06);
  --border:           rgba(35,34,31,.10);
  --accent:           #0f4024;
  --accent-2:         #14583a;
  --gold:             #b8822a;
  --sidebar-bg:       #162b1e;
  --card-shadow:      0 1px 2px rgba(35,34,31,.04), 0 16px 40px -16px rgba(35,34,31,.10);
  --card-shadow-hover:0 2px 4px rgba(35,34,31,.06), 0 28px 60px -16px rgba(35,34,31,.16);
  /* backwards-compat alias used by existing components */
  --text: #23221f;
}
```

- [ ] **Step 5: Add body background gradient in `@layer base`**

Current `@layer base` block (lines 123–133) ends with:
```css
  html {
    @apply font-sans;
  }
```

Add one rule after it inside `@layer base`:
```css
  body {
    background:
      radial-gradient(800px 400px at 88% -5%, rgba(15,64,36,.03), transparent 60%),
      radial-gradient(900px 500px at 8% 105%, rgba(184,130,42,.04), transparent 60%),
      var(--bg);
    color: var(--ink);
  }
```

*(Gradients are mirrored horizontally vs. the LTR DEWA source because the sidebar sits on the right in RTL.)*

- [ ] **Step 6: Run the test suite — all 58 should still pass**

```bash
cd "C:\Users\marwa\OneDrive\Documents\Projects\Cultural_Dashboard"
npm test -- --passWithNoTests
```

Expected: `Tests: 58 passed, 58 total`

- [ ] **Step 7: Commit**

```bash
git add app/globals.css
git commit -m "feat: replace Shadcn tokens with DEWA warm palette, register Space Grotesk/Fraunces/JetBrains Mono"
```

---

## Task 2 — Sidebar (`components/layout/Sidebar.tsx`)

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Write the failing test**

The existing sidebar tests don't check the new brand block. Add a test file `components/layout/Sidebar.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders the ERS brand abbreviation', () => {
    render(<Sidebar />)
    expect(screen.getByText('ERS')).toBeInTheDocument()
  })

  it('renders all four pillar links', () => {
    render(<Sidebar />)
    expect(screen.getByText('التعليم الإسلامي')).toBeInTheDocument()
    expect(screen.getByText('القرآن الكريم')).toBeInTheDocument()
    expect(screen.getByText('كفالة المعلمين')).toBeInTheDocument()
    expect(screen.getByText('المنح الجامعية')).toBeInTheDocument()
  })

  it('renders upload and audit links', () => {
    render(<Sidebar />)
    expect(screen.getByText('رفع البيانات')).toBeInTheDocument()
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest components/layout/Sidebar.test.tsx --no-coverage
```

Expected: FAIL — `screen.getByText('ERS')` not found (current brand shows `شؤون الإسلامية` only).

- [ ] **Step 3: Rewrite `components/layout/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PILLARS = [
  { href: '/dashboard?pillar=ISLAMIC_EDUCATION',   labelAr: 'التعليم الإسلامي', icon: '🕌' },
  { href: '/dashboard?pillar=HOLY_QURAN',          labelAr: 'القرآن الكريم',    icon: '📖' },
  { href: '/dashboard?pillar=TEACHER_SPONSORSHIP', labelAr: 'كفالة المعلمين',   icon: '👨‍🏫' },
  { href: '/dashboard?pillar=UNIVERSITY_SPONSORSHIP', labelAr: 'المنح الجامعية', icon: '🎓' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 min-h-screen flex flex-col border-e border-white/[.06]"
      style={{ background: 'var(--sidebar-bg)' }}
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
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
        <Link
          href="/dashboard"
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
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest components/layout/Sidebar.test.tsx --no-coverage
```

Expected: `Tests: 3 passed`

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/Sidebar.test.tsx
git commit -m "feat: reskin sidebar with dark #162b1e bg, Space Grotesk brand, gold dot"
```

---

## Task 3 — AppShell Header + PeriodControls

**Files:**
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/layout/PeriodControls.tsx`

No tests needed for these layout wrappers — they contain no logic to test. Verified visually in Task 6.

- [ ] **Step 1: Rewrite `components/layout/AppShell.tsx`**

```tsx
import { Sidebar } from './Sidebar'
import { PeriodControls } from './PeriodControls'
import { Suspense } from 'react'

interface AppShellProps {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}

export function AppShell({ children, title, actions }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 border-b px-6 flex items-center justify-between sticky top-0 z-10"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{title}</h2>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <PeriodControls />
            </Suspense>
            {actions}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `components/layout/PeriodControls.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'] as const
type Quarter = typeof QUARTERS[number]

const LABELS: Record<Quarter, string> = {
  Q1: 'ر١',
  Q2: 'ر٢',
  Q3: 'ر٣',
  Q4: 'ر٤',
  ANNUAL: 'سنوي',
}

export function PeriodControls() {
  const router = useRouter()
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const rawPeriod = params.get('period') ?? 'ANNUAL'
  const period: Quarter = (QUARTERS as readonly string[]).includes(rawPeriod)
    ? (rawPeriod as Quarter)
    : 'ANNUAL'

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    next.set(key, value)
    router.push(`?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={e => update('year', e.target.value)}
        className="font-jb text-[11px] rounded-full px-3 py-1 border transition-colors"
        style={{
          background: 'var(--hair)',
          borderColor: 'var(--border)',
          color: 'var(--ink-muted)',
        }}
        aria-label="السنة"
      >
        {[2024, 2025, 2026].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        {QUARTERS.map(q => (
          <button
            key={q}
            onClick={() => update('period', q)}
            className="font-jb text-[11px] px-3 py-1 rounded-full border transition-colors"
            style={
              period === q
                ? { background: 'var(--accent)', color: '#fdfcfa', borderColor: 'var(--accent)' }
                : { background: 'var(--hair)', borderColor: 'var(--border)', color: 'var(--ink-muted)' }
            }
          >
            {LABELS[q]}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test -- --passWithNoTests
```

Expected: `Tests: 58 passed, 58 total` (no tests exist for these layout components).

- [ ] **Step 4: Commit**

```bash
git add components/layout/AppShell.tsx components/layout/PeriodControls.tsx
git commit -m "feat: reskin AppShell header and PeriodControls with DEWA warm tokens"
```

---

## Task 4 — KpiCard Reskin (`lib/kpi.ts` + `KpiCard.tsx` + `KpiCard.test.tsx`)

**Files:**
- Modify: `lib/kpi.ts`
- Modify: `components/kpi/KpiCard.tsx`
- Modify: `components/kpi/KpiCard.test.tsx`

The design change: card background is always `--card-bg` (neutral). Variance is signalled by a 3px colored `border-top`. The test's `bg-amber-50` / `bg-emerald-50` / `bg-red-50` assertions must be replaced with `data-variance` attribute assertions.

- [ ] **Step 1: Update the failing tests in `components/kpi/KpiCard.test.tsx`**

Replace the three styling tests (lines 43–64) with:

```tsx
  it('uses neutral card background — no colored bg class', () => {
    const { container } = render(<KpiCard kpi={baseKpi} />)
    expect(container.querySelector('.bg-amber-50')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-emerald-50')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument()
  })

  it('sets data-variance="amber" for 90% variance', () => {
    const { container } = render(<KpiCard kpi={baseKpi} />)
    expect(container.querySelector('[data-variance="amber"]')).toBeInTheDocument()
  })

  it('sets data-variance="green" when >95%', () => {
    const greenKpi: KpiWithVariance = {
      ...baseKpi,
      variance: { actual: 98, target: 100, pct: 98, color: 'green' },
    }
    const { container } = render(<KpiCard kpi={greenKpi} />)
    expect(container.querySelector('[data-variance="green"]')).toBeInTheDocument()
  })

  it('sets data-variance="red" when <85%', () => {
    const redKpi: KpiWithVariance = {
      ...baseKpi,
      variance: { actual: 80, target: 100, pct: 80, color: 'red' },
    }
    const { container } = render(<KpiCard kpi={redKpi} />)
    expect(container.querySelector('[data-variance="red"]')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run — verify 3 tests fail**

```bash
npx jest components/kpi/KpiCard.test.tsx --no-coverage
```

Expected: 3 FAIL — `data-variance` attribute not yet present on the button, and `bg-amber-50` is still present.

- [ ] **Step 3: Update `COLOR_CLASSES` in `lib/kpi.ts`**

The existing `COLOR_CLASSES` values are CSS class strings (`text-emerald-700 bg-emerald-50 ...`). Update them to be the hex top-border colors used by `KpiCard`:

```typescript
export const COLOR_CLASSES: Record<VarianceColor, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
}
```

*(The `kpi.test.ts` `COLOR_CLASSES` test only asserts `toBeDefined()` for each key — it still passes with new values.)*

- [ ] **Step 4: Rewrite `components/kpi/KpiCard.tsx`**

```tsx
'use client'

import { COLOR_CLASSES, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

const RING_COLORS = {
  green: { arc: '#22c55e', track: '#dcfce7', text: '#166534' },
  amber: { arc: '#f59e0b', track: '#fef3c7', text: '#92400e' },
  red:   { arc: '#ef4444', track: '#fee2e2', text: '#991b1b' },
} as const

const PCT_COLORS = {
  green: '#16a34a',
  amber: '#d97706',
  red:   '#dc2626',
} as const

const CIRCUMFERENCE = 2 * Math.PI * 15 // r=15 → ≈94.25

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const ring = RING_COLORS[variance.color]
  const arcLength = Math.max(0, Math.min(variance.pct / 100, 1)) * CIRCUMFERENCE
  const topColor = COLOR_CLASSES[variance.color]

  return (
    <button
      onClick={onClick}
      data-variance={variance.color}
      className="w-full text-right rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col gap-3 border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${topColor}`,
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow)')}
    >
      {/* Header row: ring + name */}
      <div className="flex items-center justify-between gap-2">
        <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={ring.track} strokeWidth="6" />
          <circle
            cx="20" cy="20" r="15"
            fill="none"
            stroke={ring.arc}
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
          />
          <text x="20" y="24" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={ring.text}
            fontFamily="JetBrains Mono, monospace">
            {formatVariancePct(variance.pct)}
          </text>
        </svg>
        <p
          className="text-sm leading-snug flex-1 ms-1"
          style={{ color: 'var(--ink-soft)' }}
        >
          {kpi.nameAr}
        </p>
      </div>

      {/* Body: sparkline + big number */}
      <div className="flex items-end justify-between gap-2">
        <div className="w-24 h-12 flex-shrink-0">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
        <p
          className="font-fraunces text-[38px] leading-none tracking-tight"
          style={{ color: 'var(--ink)' }}
        >
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      {/* Footer: target + variance % */}
      <div
        className="flex justify-between items-center pt-3 border-t"
        style={{ borderColor: 'var(--hair)' }}
      >
        <span
          className="font-jb text-[11px] font-medium"
          style={{ color: PCT_COLORS[variance.color] }}
        >
          {formatVariancePct(variance.pct)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            {formatValue(variance.target, unit)}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>المستهدف</span>
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 5: Run — verify all KpiCard tests pass**

```bash
npx jest components/kpi/KpiCard.test.tsx lib/kpi.test.ts --no-coverage
```

Expected: all tests in both files pass.

`kpi.test.ts` has a `COLOR_CLASSES` describe block that only asserts `.green`, `.amber`, `.red` are defined — those keys still exist with the new hex values, so it passes. The `KpiCard.test.tsx` tests that checked `bg-amber-50` etc. are now replaced with `data-variance` assertions.

- [ ] **Step 6: Run full suite**

```bash
npm test -- --passWithNoTests
```

Expected: `Tests: 62 passed, 62 total` (58 original + 3 new Sidebar + 1 net new KpiCard test).

- [ ] **Step 7: Commit**

```bash
git add lib/kpi.ts components/kpi/KpiCard.tsx components/kpi/KpiCard.test.tsx
git commit -m "feat: reskin KpiCard with card-bg, 3px top-border variance signal, Fraunces numbers"
```

---

## Task 5 — ExecutiveSummary Card Strip (`components/narrative/ExecutiveSummary.tsx`)

**Files:**
- Modify: `components/narrative/ExecutiveSummary.tsx`

- [ ] **Step 1: Rewrite `components/narrative/ExecutiveSummary.tsx`**

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { generateNarrative } from '@/lib/narrative'
import type { KpiWithVariance } from '@/types'

export function ExecutiveSummary() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: kpis, error, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () => fetch(`/api/kpis?year=${year}&period=${period}`).then(r => r.json()),
  })

  if (error) {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ background: '#fff5f5', borderColor: '#fecaca' }}
      >
        <p className="text-sm" style={{ color: '#dc2626' }}>تعذّر تحميل الملخص التنفيذي</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="h-20 rounded-2xl animate-pulse"
        style={{ background: 'var(--bg-alt)' }}
      />
    )
  }

  const text = generateNarrative(kpis ?? [])
  const redCount   = (kpis ?? []).filter(k => k.variance.color === 'red').length
  const amberCount = (kpis ?? []).filter(k => k.variance.color === 'amber').length
  const greenCount = (kpis ?? []).filter(k => k.variance.color === 'green').length

  return (
    <div
      className="rounded-2xl border p-5 flex items-start gap-4 mb-6"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Icon chip */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base border"
        style={{
          background: 'rgba(15,64,36,.07)',
          borderColor: 'rgba(15,64,36,.12)',
        }}
        aria-hidden="true"
      >
        ✦
      </div>

      <div className="flex-1 min-w-0">
        {/* Label */}
        <p
          className="font-space font-semibold text-[10px] tracking-[.12em] uppercase mb-2"
          style={{ color: 'var(--gold)' }}
        >
          الملخص التنفيذي
        </p>

        {/* Status badges */}
        <div className="flex gap-4 text-[11px] mb-2.5" style={{ color: 'var(--ink-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#22c55e]" />
            {greenCount} على المسار
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#f59e0b]" />
            {amberCount} تحتاج متابعة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#ef4444]" />
            {redCount} تحتاج تدخل
          </span>
        </div>

        {/* Narrative text */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {text}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test -- --passWithNoTests
```

Expected: `Tests: 62 passed, 62 total`

- [ ] **Step 3: Commit**

```bash
git add components/narrative/ExecutiveSummary.tsx
git commit -m "feat: reskin ExecutiveSummary as DEWA card strip with gold label"
```

---

## Task 6 — Verification

**Files:** none

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 2: Full test suite**

```bash
npm test -- --passWithNoTests
```

Expected: `Tests: 62 passed, 62 total`

- [ ] **Step 3: Start dev server and verify in browser**

The dev server should already be running on port 3000. If not:
```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- [ ] Sidebar renders with dark `#162b1e` background, `ERS` brand + gold dot, section label "المحاور"
- [ ] All KPI cards have warm neutral background — no green/amber/red card backgrounds
- [ ] Each card has a 3px colored top-border matching its variance status
- [ ] Big KPI numbers render in Fraunces serif
- [ ] Period control buttons render as JetBrains Mono pills in the header
- [ ] Narrative strip shows gold "الملخص التنفيذي" label with icon chip
- [ ] Page background has subtle radial gradient visible at corners
- [ ] Hover on cards: lift effect (translateY -3px + deeper shadow)
- [ ] No Shadcn component regressions (select dropdowns, dialogs still render)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete DEWA hybrid theme — dark sidebar, warm cards, Fraunces/Space Grotesk/JetBrains Mono"
```
