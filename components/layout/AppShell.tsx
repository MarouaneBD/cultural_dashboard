'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { PeriodControls } from './PeriodControls'
import { Suspense } from 'react'

interface AppShellProps {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function AppShell({ children, title, actions }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop — closes sidebar on tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar expanded={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 border-b px-4 flex items-center justify-between sticky top-0 z-10"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          {/* Right side: hamburger + title (RTL — start is right) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              aria-label={sidebarOpen ? 'إخفاء الشريط الجانبي' : 'إظهار الشريط الجانبي'}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: 'var(--ink-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-alt)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <HamburgerIcon />
            </button>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{title}</h2>
          </div>

          {/* Left side: period controls + actions */}
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <PeriodControls />
            </Suspense>
            {actions}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
