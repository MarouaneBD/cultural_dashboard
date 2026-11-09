'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { REPORTING_YEAR } from '@/lib/config'
import { DEPARTMENTS } from '@/lib/departments'
import type { EntryKpiRow } from '@/app/api/entry/route'

type TabType = 'ACTUAL' | 'TARGET'
type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4'

const PERIODS: Period[] = ['Q1', 'Q2', 'Q3', 'Q4']
const UNIT_LABEL: Record<string, string> = { COUNT: 'عدد', PERCENT: '%', CURRENCY: 'درهم' }

export default function DataEntryPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()

  const [tab, setTab] = useState<TabType>('ACTUAL')
  const [period, setPeriod] = useState<Period>('Q1')
  const [values, setValues] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'
  const [adminPillar, setAdminPillar] = useState<string>(DEPARTMENTS[0].id)
  const pillar = isAdmin ? adminPillar : (session?.user?.assignedPillarId ?? '')

  const entryPeriod = tab === 'TARGET' ? 'ANNUAL' : period

  const { data: rows = [], isLoading } = useQuery<EntryKpiRow[]>({
    queryKey: ['entry', pillar, entryPeriod, tab],
    queryFn: () =>
      fetch(`/api/entry?pillar=${pillar}&period=${entryPeriod}&year=${REPORTING_YEAR}&tableType=${tab}`)
        .then(r => { if (!r.ok) throw new Error('فشل التحميل'); return r.json() }),
    enabled: !!pillar,
  })

  // Reset input values when tab, period, or pillar changes
  useEffect(() => { setValues({}) }, [tab, period, pillar])

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const submit = useMutation({
    mutationFn: async () => {
      const submitRows = Object.entries(values)
        .filter(([, v]) => v.trim() !== '')
        .map(([kpiId, v]) => ({ kpiId, value: parseFloat(v) }))
        .filter(r => !isNaN(r.value))

      if (submitRows.length === 0) throw new Error('لا توجد قيم للحفظ')

      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar,
          period: entryPeriod,
          year: REPORTING_YEAR,
          tableType: tab,
          rows: submitRows,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `خطأ ${res.status}`)
      }
      return res.json() as Promise<{ direct: number; queued: number }>
    },
    onSuccess: ({ direct, queued }) => {
      setValues({})
      qc.invalidateQueries({ queryKey: ['entry', pillar] })
      const parts: string[] = []
      if (direct > 0) parts.push(`تم حفظ ${direct} قيمة مباشرة`)
      if (queued > 0) parts.push(`تم إرسال ${queued} للمراجعة`)
      showToast(parts.join(' · '), 'success')
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  // Compute footer summary
  const dirtyEntries = Object.entries(values).filter(([, v]) => v.trim() !== '')
  const overwrites = dirtyEntries.filter(
    ([kpiId]) => rows.find(r => r.kpiId === kpiId)?.currentValue != null
  ).length
  const newEntries = dirtyEntries.length - overwrites
  const needsApproval = tab === 'TARGET' ? dirtyEntries.length : overwrites

  const deptLabel = DEPARTMENTS.find(d => d.id === pillar)?.labelAr ?? ''

  return (
    <AppShell title="إدخال البيانات">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Admin pillar selector */}
        {isAdmin && (
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>القسم:</label>
            <select
              value={adminPillar}
              onChange={e => setAdminPillar(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.labelAr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Department name for EDITOR */}
        {!isAdmin && (
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{deptLabel}</p>
        )}

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {(['ACTUAL', 'TARGET'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--ink-muted)',
              }}
            >
              {t === 'ACTUAL' ? 'المتحققات' : 'المستهدفات'}
            </button>
          ))}
        </div>

        {/* Period selector — actuals only */}
        {tab === 'ACTUAL' && (
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: period === p ? 'var(--accent)' : 'var(--bg-alt)',
                  color: period === p ? '#fff' : 'var(--ink)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Targets info banner */}
        {tab === 'TARGET' && (
          <div
            className="rounded-lg px-4 py-2 text-sm"
            style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}
          >
            المستهدفات تخضع لمراجعة الإدارة قبل الحفظ
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="h-10 rounded-lg animate-pulse"
                style={{ background: 'var(--bg-alt)' }}
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>لا توجد مؤشرات لهذا القسم</p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--ink-muted)' }}>
                    المؤشر
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-16" style={{ color: 'var(--ink-muted)' }}>
                    الوحدة
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-32" style={{ color: 'var(--ink-muted)' }}>
                    {tab === 'TARGET' ? 'المستهدف الحالي' : 'القيمة السابقة'}
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-36" style={{ color: 'var(--ink-muted)' }}>
                    {tab === 'TARGET' ? 'المستهدف الجديد' : 'القيمة الجديدة'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isOverwrite = row.currentValue != null
                  const hasInput = (values[row.kpiId] ?? '').trim() !== ''
                  return (
                    <tr
                      key={row.kpiId}
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--border)' : undefined,
                        background: isOverwrite && hasInput ? '#fffbeb' : undefined,
                        borderRight: isOverwrite && hasInput ? '3px solid #f59e0b' : undefined,
                      }}
                    >
                      <td className="px-4 py-2" style={{ color: 'var(--ink)' }}>
                        {row.nameAr}
                        {row.hasPending && (
                          <span
                            className="mr-2 text-xs px-1.5 py-0.5 rounded"
                            style={{ background: '#fef3c7', color: '#92400e' }}
                          >
                            بانتظار الموافقة
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--ink-muted)' }}>
                        {UNIT_LABEL[row.unit] ?? row.unit}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--ink-muted)' }}>
                        {row.currentValue != null ? row.currentValue.toLocaleString('en') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          dir="ltr"
                          value={values[row.kpiId] ?? ''}
                          onChange={e => setValues(v => ({ ...v, [row.kpiId]: e.target.value }))}
                          className="w-full rounded-lg border px-2 py-1 text-center text-sm"
                          style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-alt)',
                            color: 'var(--ink)',
                          }}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sticky footer — only shown when inputs are filled */}
        {dirtyEntries.length > 0 && (
          <div
            className="sticky bottom-4 flex items-center justify-between rounded-xl px-4 py-3 shadow-lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              {newEntries > 0 && `${newEntries} قيمة جديدة`}
              {newEntries > 0 && needsApproval > 0 && ' · '}
              {needsApproval > 0 && `${needsApproval} يحتاج موافقة`}
            </p>
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {submit.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm shadow-xl z-50"
            style={{
              background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: toast.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
            }}
          >
            {toast.msg}
          </div>
        )}

      </div>
    </AppShell>
  )
}
