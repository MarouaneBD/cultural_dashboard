'use client'

import { useState, useEffect, FormEvent } from 'react'
import type { UserRole } from '@prisma/client'
import { DEPARTMENTS } from '@/lib/departments'
import type { UserRow } from './UserTable'

type Mode = 'create' | 'edit' | 'reset'

interface Props {
  mode: Mode
  user?: UserRow
  onClose: () => void
  onSaved: () => void
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'VIEWER', label: 'مشاهد' },
  { value: 'EDITOR', label: 'محرر' },
  { value: 'ADMIN', label: 'مدير' },
]

const TITLES: Record<Mode, string> = {
  create: 'إضافة مستخدم',
  edit: 'تعديل مستخدم',
  reset: 'إعادة تعيين كلمة المرور',
}

export function UserPanel({ mode, user, onClose, onSaved }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role ?? 'VIEWER')

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const assignedPillarId = form.get('assignedPillarId') as string | null
    let res: Response

    if (mode === 'create') {
      res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.get('username'),
          name: form.get('name') || undefined,
          role: form.get('role'),
          password: form.get('password'),
          assignedPillarId: assignedPillarId || null,
        }),
      })
    } else if (mode === 'edit') {
      res = await fetch(`/api/admin/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name') || undefined,
          role: form.get('role'),
          assignedPillarId: assignedPillarId || null,
        }),
      })
    } else {
      // reset
      const newPassword = form.get('password') as string
      const confirm = form.get('confirm') as string
      if (newPassword !== confirm) {
        setError('كلمتا المرور غير متطابقتين')
        setLoading(false)
        return
      }
      res = await fetch(`/api/admin/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
    }

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'حدث خطأ')
      return
    }

    onSaved()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides in from the start (right in RTL) */}
      <aside
        className="fixed inset-y-0 start-0 z-50 w-80 flex flex-col shadow-xl"
        style={{ background: 'var(--card-bg)', borderInlineEnd: '1px solid var(--border)' }}
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[mode]}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{TITLES[mode]}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--ink-muted)' }}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
                اسم المستخدم *
              </label>
              <input
                name="username"
                type="text"
                required
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
              />
            </div>
          )}

          {mode !== 'reset' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
                  الاسم الكامل
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={user?.name ?? ''}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
                  الدور *
                </label>
                <select
                  name="role"
                  required
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Department assignment — only shown when role is EDITOR */}
              {selectedRole === 'EDITOR' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
                    القسم المخصص
                  </label>
                  <select
                    name="assignedPillarId"
                    defaultValue={user?.assignedPillarId ?? ''}
                    className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                  >
                    <option value="">— بدون تخصيص —</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.labelAr}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {(mode === 'create' || mode === 'reset') && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
                  {mode === 'create' ? 'كلمة المرور الأولية *' : 'كلمة المرور الجديدة *'}
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                />
              </div>

              {mode === 'reset' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
                    تأكيد كلمة المرور *
                  </label>
                  <input
                    name="confirm"
                    type="password"
                    required
                    className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2 mt-auto pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2 text-sm border"
              style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
