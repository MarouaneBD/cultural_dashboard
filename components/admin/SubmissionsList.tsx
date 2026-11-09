'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { UploadSubmissionClient } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد المراجعة',
  APPROVED: 'تمت المراجعة',
  REJECTED: 'مرفوض',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ar-AE-u-nu-latn', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function SubmissionsList() {
  const { data: submissions = [], isLoading, isError } = useQuery<UploadSubmissionClient[]>({
    queryKey: ['admin-submissions'],
    queryFn: () => fetch('/api/admin/submissions').then(r => {
      if (!r.ok) throw new Error('فشل تحميل البيانات')
      return r.json()
    }),
  })

  if (isLoading) return (
    <>
      <div className="hidden md:block space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
      </div>
      <div className="md:hidden space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
      </div>
    </>
  )

  if (isError) return (
    <p className="text-sm text-center py-8" style={{ color: 'var(--ink-muted)' }}>تعذّر تحميل الطلبات</p>
  )

  if (submissions.length === 0) return (
    <p className="text-sm text-center py-8" style={{ color: 'var(--ink-muted)' }}>لا توجد طلبات رفع بعد</p>
  )

  return (
    <>
      {/* ── Desktop table (unchanged) ── */}
      <table className="hidden md:table w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>
            <th className="text-right p-3 font-medium">المرسِل</th>
            <th className="text-right p-3 font-medium">الملف</th>
            <th className="text-right p-3 font-medium">التاريخ</th>
            <th className="text-right p-3 font-medium">الصفوف المعلقة</th>
            <th className="text-right p-3 font-medium">الحالة</th>
            <th className="text-right p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {submissions.map(s => (
            <tr key={s.id} className="hover:bg-[var(--bg-alt)] transition-colors">
              <td className="p-3">{s.submitter.name ?? s.submitter.username}</td>
              <td className="p-3 font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>{s.filename}</td>
              <td className="p-3 text-xs" style={{ color: 'var(--ink-muted)' }}>{formatDate(s.uploadedAt)}</td>
              <td className="p-3 text-xs">
                {s.pendingCount > 0
                  ? <span className="font-semibold" style={{ color: 'var(--gold)' }}>{s.pendingCount} / {s.totalCount}</span>
                  : <span style={{ color: 'var(--ink-muted)' }}>0 / {s.totalCount}</span>
                }
              </td>
              <td className="p-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? ''}`}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </td>
              <td className="p-3">
                <Link
                  href={`/admin/submissions/${s.id}`}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  مراجعة
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {submissions.map(s => (
          <div
            key={s.id}
            className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {s.submitter.name ?? s.submitter.username}
              </span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[s.status] ?? ''}`}>
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
            </div>
            <p className="text-xs font-mono truncate" style={{ color: 'var(--ink-muted)' }}>
              {s.filename}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                {formatDate(s.uploadedAt)}
              </span>
              <span className="text-xs">
                {s.pendingCount > 0
                  ? <span className="font-semibold" style={{ color: 'var(--gold)' }}>{s.pendingCount} / {s.totalCount} معلق</span>
                  : <span style={{ color: 'var(--ink-muted)' }}>0 / {s.totalCount}</span>
                }
              </span>
            </div>
            <Link
              href={`/admin/submissions/${s.id}`}
              className="block text-center text-sm py-2 rounded-lg font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              مراجعة
            </Link>
          </div>
        ))}
      </div>
    </>
  )
}
