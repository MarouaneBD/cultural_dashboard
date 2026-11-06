'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { UploadSubmissionClient } from '@/types'

const PERIOD_LABELS: Record<string, string> = {
  Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع', ANNUAL: 'سنوي',
}

function fmt(n: number) { return n.toLocaleString('en') }

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ar-AE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function SubmissionsStatus() {
  const qc = useQueryClient()
  const { data: submissions = [], isLoading } = useQuery<UploadSubmissionClient[]>({
    queryKey: ['editor-submissions'],
    queryFn: () => fetch('/api/upload/submissions').then(r => r.json()),
  })

  async function dismiss(submissionId: string, rowId: string) {
    await fetch(`/api/upload/submissions/${submissionId}/rows/${rowId}/dismiss`, { method: 'POST' })
    qc.invalidateQueries({ queryKey: ['editor-submissions'] })
    qc.invalidateQueries({ queryKey: ['editor-submissions-count'] })
  }

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
    </div>
  )

  if (submissions.length === 0) return (
    <p className="text-sm text-center py-8" style={{ color: 'var(--ink-muted)' }}>لا توجد طلبات رفع سابقة</p>
  )

  return (
    <div className="space-y-6">
      {submissions.map(s => (
        <div key={s.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{s.filename}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{formatDate(s.uploadedAt)}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-alt)', color: 'var(--ink-muted)' }}>
              {s.pendingCount > 0 ? `${s.pendingCount} صف معلق` : 'تمت المراجعة'}
            </span>
          </div>

          <div className="space-y-2">
            {s.rows.map(row => (
              <div key={row.id} className="flex items-start gap-3 text-xs py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex-1">
                  <p style={{ color: 'var(--ink)' }}>{row.kpiNameAr} — {PERIOD_LABELS[row.period] ?? row.period} {row.year}</p>
                  <p className="mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {fmt(row.oldValue)} → {fmt(row.newValue)}
                  </p>
                  {row.status === 'REJECTED' && row.adminComment && (
                    <p className="mt-1 text-red-600">{row.adminComment}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {row.status === 'PENDING' && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">قيد المراجعة</span>
                  )}
                  {row.status === 'APPROVED' && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">تمت الموافقة</span>
                  )}
                  {row.status === 'REJECTED' && (
                    <div className="flex gap-2 items-center">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">مرفوض</span>
                      <Link href="/upload" className="px-2 py-0.5 rounded-lg text-white text-xs" style={{ background: 'var(--accent)' }}>
                        أعد الرفع
                      </Link>
                      <button
                        onClick={() => dismiss(s.id, row.id)}
                        className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ color: 'var(--ink-muted)', background: 'var(--bg-alt)' }}
                      >
                        تجاهل
                      </button>
                    </div>
                  )}
                  {row.status === 'DISMISSED' && (
                    <span style={{ color: 'var(--ink-muted)' }}>تم التجاهل</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
