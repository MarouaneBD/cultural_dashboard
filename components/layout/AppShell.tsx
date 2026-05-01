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
        <header className="h-14 border-b border-[--border] bg-white px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {actions}
            <Suspense fallback={null}>
              <PeriodControls />
            </Suspense>
          </div>
          <h2 className="font-semibold text-base text-[--text]">{title}</h2>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
