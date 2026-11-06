export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/layout/AppShell'
import { prisma } from '@/lib/prisma'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function ActionBadge({ action }: { action: string }) {
  const op = action.split('.')[1] ?? action
  const styles: Record<string, string> = {
    create:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    createMany: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    update:     'bg-amber-50 text-amber-700 border-amber-200',
    updateMany: 'bg-amber-50 text-amber-700 border-amber-200',
    upsert:     'bg-blue-50 text-blue-700 border-blue-200',
    delete:     'bg-red-50 text-red-700 border-red-200',
    deleteMany: 'bg-red-50 text-red-700 border-red-200',
  }
  const cls = styles[op] ?? 'bg-slate-50 text-slate-600 border-slate-200'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono border ${cls}`}>
      {action}
    </span>
  )
}

function JsonCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-300">—</span>

  // Parse outside of JSX — ESLint disallows returning JSX from inside try/catch
  let display: string
  try {
    const parsed = JSON.parse(value)
    const keys = Object.keys(parsed).filter(k => !['id', 'createdAt', 'updatedAt', 'passwordHash'].includes(k))
    display = keys.length === 0 ? '' : keys.map(k => `${k}: ${JSON.stringify(parsed[k])}`).join(' · ')
  } catch {
    display = value
  }

  if (!display) return <span className="text-slate-400 text-xs font-mono">—</span>
  return <span className="text-xs font-mono text-slate-500">{display}</span>
}

export default async function AuditPage() {
  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 200 }),
    prisma.user.findMany({ select: { id: true, username: true, name: true } }),
  ])

  const userMap = new Map(users.map(u => [u.id, u.username + (u.name ? ` (${u.name})` : '')]))

  return (
    <AppShell title="سجل المراجعة">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            آخر {logs.length} إجراء مسجّل
          </p>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs" style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink-muted)' }}>
                <th className="text-right px-4 py-3 font-medium">التوقيت</th>
                <th className="text-right px-4 py-3 font-medium">المستخدم</th>
                <th className="text-right px-4 py-3 font-medium">الإجراء</th>
                <th className="text-right px-4 py-3 font-medium">القيمة السابقة</th>
                <th className="text-right px-4 py-3 font-medium">القيمة الجديدة</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className="border-b last:border-0 transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--bg)',
                  }}
                >
                  <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>
                    {userMap.get(log.userId) ?? log.userId}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <JsonCell value={log.oldValue} />
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <JsonCell value={log.newValue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <p className="text-center py-16 text-sm" style={{ color: 'var(--ink-muted)' }}>
              لا توجد سجلات بعد
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
