'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { DIVISIONS } from '@/lib/divisions'
import { DEPARTMENTS } from '@/lib/departments'
import type { DivisionId } from '@/lib/divisions'
import type { PillarId } from '@/types'

type FormState = {
  nameAr: string
  unit: string
  activityType: string
  showInDashboard: boolean
}

const INITIAL_FORM: FormState = { nameAr: '', unit: 'COUNT', activityType: 'CUMULATIVE', showInDashboard: false }

export default function AdminKpisPage() {
  const qc = useQueryClient()

  // Two-step selector for grid view
  const [viewDivision, setViewDivision] = useState<DivisionId>(DIVISIONS[0].id)
  const viewDepts = DEPARTMENTS.filter(d => d.division === viewDivision)
  const [viewPillar, setViewPillar] = useState<PillarId>(viewDepts[0].id as PillarId)

  // Two-step selector for KPI creation form
  const [createDivision, setCreateDivision] = useState<DivisionId>(DIVISIONS[0].id)
  const createDepts = DEPARTMENTS.filter(d => d.division === createDivision)
  const [createPillar, setCreatePillar] = useState<string>(createDepts[0].id)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [nameError, setNameError] = useState('')

  function handleDivisionChange(divId: DivisionId) {
    setCreateDivision(divId)
    const depts = DEPARTMENTS.filter(d => d.division === divId)
    setCreatePillar(depts[0].id)
  }

  function handleViewDivisionChange(divId: DivisionId) {
    setViewDivision(divId)
    const depts = DEPARTMENTS.filter(d => d.division === divId)
    setViewPillar(depts[0].id as PillarId)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setNameError('')

    if (form.nameAr.trim().length < 3) {
      setNameError('الاسم قصير جداً (3 أحرف على الأقل)')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: form.nameAr.trim(),
          pillar: createPillar,
          unit: form.unit,
          activityType: form.activityType,
          showInDashboard: form.showInDashboard,
        }),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (res.status === 409) { setNameError('هذا الاسم مستخدم لمؤشر آخر في نفس القسم'); return }
      if (!res.ok) { setFormError(body.error ?? `خطأ ${res.status}`); return }

      setForm(INITIAL_FORM)
      qc.invalidateQueries({ queryKey: ['kpis'] })
      // Switch grid view to the newly-created KPI's pillar
      setViewDivision(createDivision)
      setViewPillar(createPillar as PillarId)
    } catch {
      setFormError('تعذّر الاتصال بالخادم')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="إدارة المؤشرات">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Create KPI form ── */}
        <section className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>إضافة مؤشر جديد</h2>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Step 1: Sector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>القطاع</label>
                <select
                  value={createDivision}
                  onChange={e => handleDivisionChange(e.target.value as DivisionId)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  {DIVISIONS.map(div => (
                    <option key={div.id} value={div.id}>{div.labelAr}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Department (filtered by selected sector) */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>القسم</label>
                <select
                  value={createPillar}
                  onChange={e => setCreatePillar(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  {createDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.labelAr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPI name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>اسم المؤشر بالعربية</label>
              <input
                type="text"
                dir="rtl"
                value={form.nameAr}
                onChange={e => { setForm(f => ({ ...f, nameAr: e.target.value })); setNameError('') }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: nameError ? '#dc2626' : 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                placeholder="مثال: عدد البرامج المنفذة"
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>

            {/* Unit + Activity type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>الوحدة</label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  <option value="COUNT">عدد</option>
                  <option value="PERCENT">نسبة مئوية</option>
                  <option value="CURRENCY">عملة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>نوع النشاط</label>
                <select
                  value={form.activityType}
                  onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
                >
                  <option value="CUMULATIVE">تراكمي</option>
                  <option value="MONTHLY_VARIANCE">شهري</option>
                </select>
              </div>
            </div>

            {/* Show in dashboard toggle */}
            <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>عرض في الصفحة الرئيسية للقطاع</p>
              </div>
              <button
                type="button"
                dir="ltr"
                onClick={() => setForm(f => ({ ...f, showInDashboard: !f.showInDashboard }))}
                className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                style={{ background: form.showInDashboard ? 'var(--accent)' : 'var(--border)' }}
                role="switch"
                aria-checked={form.showInDashboard}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
                  style={{ transform: form.showInDashboard ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
                />
              </button>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? 'جاري الإضافة...' : 'إضافة مؤشر'}
              </button>
            </div>
          </form>
        </section>

        {/* ── KPI grid view ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>مؤشرات القسم</h2>

          {/* Two-step sector→dept selector for grid */}
          <div className="flex gap-3 items-center">
            <select
              value={viewDivision}
              onChange={e => handleViewDivisionChange(e.target.value as DivisionId)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              {DIVISIONS.map(div => (
                <option key={div.id} value={div.id}>{div.labelAr}</option>
              ))}
            </select>
            <select
              value={viewPillar}
              onChange={e => setViewPillar(e.target.value as PillarId)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-alt)', color: 'var(--ink)' }}
            >
              {viewDepts.map(d => (
                <option key={d.id} value={d.id}>{d.labelAr}</option>
              ))}
            </select>
          </div>

          <KpiGrid pillar={viewPillar} />
        </section>

      </div>
    </AppShell>
  )
}
