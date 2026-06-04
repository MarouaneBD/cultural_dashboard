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

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 200,
  })

  return (
    <AppShell title="سجل المراجعة">
      <div className="max-w-5xl mx-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b">
              <th className="text-right p-3 font-medium">التوقيت</th>
              <th className="text-right p-3 font-medium">المستخدم</th>
              <th className="text-right p-3 font-medium">الإجراء</th>
              <th className="text-right p-3 font-medium">القيمة السابقة</th>
              <th className="text-right p-3 font-medium">القيمة الجديدة</th>
            </tr>
          </thead>
          <tbody className="divide-y">
{logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50">
                <td className="p-3 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </td>
                <td className="p-3">{log.userId}</td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 max-w-xs truncate text-xs text-slate-500">{log.oldValue ?? '—'}</td>
                <td className="p-3 max-w-xs truncate text-xs text-slate-500">{log.newValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="text-center text-slate-400 py-12 text-sm">لا توجد سجلات بعد</p>
        )}
      </div>
    </AppShell>
  )
}
