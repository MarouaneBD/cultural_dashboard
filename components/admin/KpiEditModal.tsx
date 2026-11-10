// components/admin/KpiEditModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'

type KpiData = {
  id: string
  nameAr: string
  activityType: string
  unit: string
  owner: string | null
  showInDashboard: boolean
}

interface Props {
  kpiId: string
  onClose: () => void
  onSaved: () => void
}

export function KpiEditModal({ kpiId, onClose, onSaved }: Props) {
  const [data, setData] = useState<KpiData | null>(null)
  const [nameAr, setNameAr] = useState('')
  const [activityType, setActivityType] = useState('')
  const [unit, setUnit] = useState('')
  const [owner, setOwner] = useState('')
  const [showInDashboard, setShowInDashboard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/kpis/${kpiId}`)
      .then(async r => {
        const body = await r.json()
        if (!r.ok) throw new Error(body?.error ?? `API ${r.status}`)
        return body as KpiData
      })
      .then((d: KpiData) => {
        setData(d)
        setNameAr(d.nameAr)
        setActivityType(d.activityType)
        setUnit(d.unit)
        setOwner(d.owner ?? '')
        setShowInDashboard(d.showInDashboard ?? false)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setSubmitError(err instanceof Error ? err.message : 'تعذّر تحميل بيانات المؤشر')
        setLoading(false)
      })
  }, [kpiId])

  async function handleSave() {
    setNameError('')
    setSubmitError('')

    const patch: Record<string, string | boolean | null> = {}
    if (data && nameAr.trim() !== data.nameAr) {
      if (nameAr.trim().length < 3) {
        setNameError('الاسم قصير جداً (3 أحرف على الأقل)')
        return
      }
      patch.nameAr = nameAr.trim()
    }
    if (data && activityType !== data.activityType) patch.activityType = activityType
    if (data && unit !== data.unit) patch.unit = unit
    if (data && (owner || null) !== data.owner) patch.owner = owner || null
    if (data && showInDashboard !== data.showInDashboard) patch.showInDashboard = showInDashboard

    if (Object.keys(patch).length === 0) { onClose(); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/kpis/${kpiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (res.status === 409) {
        setNameError('هذا الاسم مستخدم لمؤشر آخر في نفس القسم')
        return
      }
      if (!res.ok) {
        setSubmitError(body.error ?? `خطأ ${res.status}`)
        return
      }
      onSaved()
      onClose()
    } catch {
      setSubmitError('تعذّر الاتصال بالخادم')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSubmitError('')
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/kpis/${kpiId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setSubmitError(body.error ?? `خطأ ${res.status}`)
        setConfirmDelete(false)
        return
      }
      onSaved()
      onClose()
    } catch {
      setSubmitError('تعذّر الاتصال بالخادم')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rounded-2xl w-full max-w-md p-6 space-y-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>تعديل بيانات المؤشر</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-alt)]">
            <X size={16} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {loading && <p className="text-sm text-center py-4" style={{ color: 'var(--ink-muted)' }}>جاري التحميل...</p>}

        {!loading && (
          <div className="space-y-3">
            {/* Arabic name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>
                الاسم بالعربية
              </label>
              <input
                type="text"
                dir="rtl"
                value={nameAr}
                onChange={e => { setNameAr(e.target.value); setNameError('') }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: nameError ? '#dc2626' : 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>

            {/* Activity type */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>نوع النشاط</label>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              >
                <option value="CUMULATIVE">تراكمي</option>
                <option value="MONTHLY_VARIANCE">شهري</option>
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>الوحدة</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              >
                <option value="COUNT">عدد</option>
                <option value="PERCENT">نسبة مئوية</option>
                <option value="CURRENCY">عملة</option>
              </select>
            </div>

            {/* Owner / category */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>الفئة (اختياري)</label>
              <input
                type="text"
                dir="rtl"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
              />
            </div>

            {/* Show in sector homepage */}
            <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>عرض في الصفحة الرئيسية للقطاع</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>عند التفعيل، يظهر هذا المؤشر في مخطط القطاع</p>
              </div>
              {/* dir="ltr" keeps standard LTR knob travel (left=off, right=on) regardless of page RTL */}
              <button
                type="button"
                dir="ltr"
                onClick={() => setShowInDashboard(v => !v)}
                className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                style={{ background: showInDashboard ? 'var(--accent)' : 'var(--border)' }}
                role="switch"
                aria-checked={showInDashboard}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
                  style={{ transform: showInDashboard ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
                />
              </button>
            </div>

            {submitError && <p className="text-xs text-red-600">{submitError}</p>}

            {/* Delete confirmation inline */}
            {confirmDelete && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs text-red-700 font-medium">
                  سيتم حذف المؤشر وجميع بياناته (الأهداف والمتحقق) نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 text-xs py-1.5 rounded-lg text-white bg-red-600 disabled:opacity-60"
                  >
                    {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-xs py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {/* Delete trigger */}
              <button
                onClick={() => { setConfirmDelete(true); setSubmitError('') }}
                disabled={saving || deleting}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <Trash2 size={13} />
                حذف المؤشر
              </button>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg" style={{ color: 'var(--ink-muted)' }}>
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="text-sm px-4 py-2 rounded-lg text-white disabled:opacity-60"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
