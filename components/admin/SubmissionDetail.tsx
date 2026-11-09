'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { UploadSubmissionClient, SubmissionRowClient } from '@/types'

const PERIOD_LABELS: Record<string, string> = {
  Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع', ANNUAL: 'سنوي',
}
const ROW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلق', APPROVED: 'موافق عليه', REJECTED: 'مرفوض', DISMISSED: 'تم التجاهل',
}
const ROW_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-700 bg-yellow-50',
  APPROVED: 'text-green-700 bg-green-50',
  REJECTED: 'text-red-700 bg-red-50',
  DISMISSED: 'text-gray-500 bg-gray-50',
}

function fmt(n: number) { return n.toLocaleString('en') }

function Diff({ oldVal, newVal }: { oldVal: number; newVal: number }) {
  const d = newVal - oldVal
  const sign = d > 0 ? '+' : ''
  const color = d > 0 ? '#059669' : d < 0 ? '#dc2626' : 'var(--ink-muted)'
  return <span style={{ color }}>{sign}{fmt(d)}</span>
}

function RejectForm({ rowId, submissionId, onDone }: { rowId: string; submissionId: string; onDone: () => void }) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (comment.trim().length < 10) { setError('يجب أن يكون السبب 10 أحرف على الأقل'); return }
    setLoading(true)
    const res = await fetch(`/api/admin/submissions/${submissionId}/rows/${rowId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: comment.trim() }),
    })
    setLoading(false)
    if (!res.ok) { setError('حدث خطأ'); return }
    onDone()
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="سبب الرفض (10 أحرف على الأقل)..."
        rows={2}
        className="rounded-lg border px-3 py-2 text-xs w-full"
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--ink)' }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading}
          className="text-xs px-3 py-1 rounded-lg text-white disabled:opacity-60"
          style={{ background: '#dc2626' }}>
          {loading ? '...' : 'تأكيد الرفض'}
        </button>
        <button onClick={onDone} className="text-xs px-3 py-1 rounded-lg" style={{ color: 'var(--ink-muted)' }}>
          إلغاء
        </button>
      </div>
    </div>
  )
}

function RowActions({ row, submissionId, onRefresh }: { row: SubmissionRowClient; submissionId: string; onRefresh: () => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [approving, setApproving] = useState(false)

  if (row.status !== 'PENDING') {
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROW_STATUS_COLORS[row.status] ?? ''}`}>
        {ROW_STATUS_LABELS[row.status]}
      </span>
    )
  }

  async function approve() {
    setApproving(true)
    await fetch(`/api/admin/submissions/${submissionId}/rows/${row.id}/approve`, { method: 'POST' })
    setApproving(false)
    onRefresh()
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <button onClick={approve} disabled={approving}
          className="text-xs px-2 py-1 rounded-lg text-white disabled:opacity-60"
          style={{ background: 'var(--accent)' }}>
          {approving ? '...' : 'قبول'}
        </button>
        <button onClick={() => setRejecting(r => !r)}
          className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50">
          رفض
        </button>
      </div>
      {rejecting && (
        <RejectForm rowId={row.id} submissionId={submissionId} onDone={() => { setRejecting(false); onRefresh() }} />
      )}
    </div>
  )
}

export function SubmissionDetail({ submissionId }: { submissionId: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery<UploadSubmissionClient>({
    queryKey: ['admin-submission', submissionId],
    queryFn: () => fetch(`/api/admin/submissions/${submissionId}`).then(r => {
      if (!r.ok) throw new Error('فشل')
      return r.json()
    }),
  })

  const [approvingAll, setApprovingAll] = useState(false)
  const [approveAllError, setApproveAllError] = useState('')

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-submission', submissionId] })
    qc.invalidateQueries({ queryKey: ['admin-pending-count'] })
    qc.invalidateQueries({ queryKey: ['admin-submissions'] })
  }

  async function approveAll() {
    setApprovingAll(true)
    setApproveAllError('')
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/approve-all`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setApproveAllError(body.error ?? `خطأ ${res.status}`)
        return
      }
      refresh()
    } catch {
      setApproveAllError('خطأ في الاتصال بالخادم')
    } finally {
      setApprovingAll(false)
    }
  }

  if (isLoading) return <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
  if (isError || !data) return <p className="text-sm text-center py-8" style={{ color: 'var(--ink-muted)' }}>تعذّر تحميل البيانات</p>

  const hasPending = data.pendingCount > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {data.submitter.name ?? data.submitter.username} — {data.filename}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {data.pendingCount} صف معلق من أصل {data.totalCount}
          </p>
        </div>
        {hasPending && (
          <button onClick={approveAll} disabled={approvingAll}
            className="text-sm px-4 py-2 rounded-lg text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>
            {approvingAll ? 'جارٍ القبول...' : 'قبول الكل'}
          </button>
        )}
      </div>
      {approveAllError && (
        <p className="text-sm text-red-600 text-center">{approveAllError}</p>
      )}

      {/* ── Desktop rows table (unchanged) ── */}
      <table className="hidden md:table w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>
            <th className="text-right p-3 font-medium">المؤشر</th>
            <th className="text-right p-3 font-medium">الفترة</th>
            <th className="text-right p-3 font-medium">القيمة الحالية</th>
            <th className="text-right p-3 font-medium">القيمة الجديدة</th>
            <th className="text-right p-3 font-medium">الفرق</th>
            <th className="text-right p-3 font-medium">الإجراء</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {data.rows.map(row => (
            <tr key={row.id} className="hover:bg-[var(--bg-alt)] transition-colors">
              <td className="p-3 text-xs">{row.kpiNameAr}</td>
              <td className="p-3 text-xs">{PERIOD_LABELS[row.period] ?? row.period} {row.year}</td>
              <td className="p-3 text-xs font-mono">{fmt(row.oldValue)}</td>
              <td className="p-3 text-xs font-mono">{fmt(row.newValue)}</td>
              <td className="p-3 text-xs font-mono"><Diff oldVal={row.oldValue} newVal={row.newValue} /></td>
              <td className="p-3">
                <RowActions row={row} submissionId={submissionId} onRefresh={refresh} />
                {row.adminComment && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{row.adminComment}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {data.rows.map(row => (
          <div
            key={row.id}
            className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {row.kpiNameAr}
            </p>
            <div className="grid grid-cols-2 gap-x-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
              <div>
                <span className="block mb-0.5">الفترة</span>
                <span className="font-medium" style={{ color: 'var(--ink)' }}>
                  {PERIOD_LABELS[row.period] ?? row.period} {row.year}
                </span>
              </div>
              <div>
                <span className="block mb-0.5">الفرق</span>
                <span className="font-mono font-medium">
                  <Diff oldVal={row.oldValue} newVal={row.newValue} />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
              <div>
                <span className="block mb-0.5">الحالي</span>
                <span className="font-mono font-medium" style={{ color: 'var(--ink)' }}>
                  {fmt(row.oldValue)}
                </span>
              </div>
              <div>
                <span className="block mb-0.5">الجديد</span>
                <span className="font-mono font-medium" style={{ color: 'var(--ink)' }}>
                  {fmt(row.newValue)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <RowActions row={row} submissionId={submissionId} onRefresh={refresh} />
              {row.adminComment && (
                <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>{row.adminComment}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
