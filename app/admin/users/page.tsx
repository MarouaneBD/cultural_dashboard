'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { UserTable, type UserRow } from '@/components/admin/UserTable'
import { UserPanel } from '@/components/admin/UserPanel'

type PanelState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; user: UserRow }
  | { open: true; mode: 'reset'; user: UserRow }

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch('/api/admin/users')
  if (!res.ok) throw new Error('فشل تحميل المستخدمين')
  return res.json()
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<PanelState>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  const closePanel = useCallback(() => setPanel({ open: false }), [])

  const handleSaved = useCallback(() => {
    setPanel({ open: false })
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }, [queryClient])

  async function handleDelete(user: UserRow) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteConfirm(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    }
  }

  return (
    <AppShell title="إدارة المستخدمين">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            {users.length} مستخدم
          </p>
          <button
            onClick={() => setPanel({ open: true, mode: 'create' })}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            + إضافة مستخدم
          </button>
        </div>

        {isLoading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--ink-muted)' }}>
            جارٍ التحميل…
          </p>
        )}

        {error && (
          <p className="text-center py-12 text-sm text-red-600">
            فشل تحميل المستخدمين
          </p>
        )}

        {!isLoading && !error && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <UserTable
              users={users}
              currentUserId={session?.user?.id ?? ''}
              onEdit={user => setPanel({ open: true, mode: 'edit', user })}
              onResetPassword={user => setPanel({ open: true, mode: 'reset', user })}
              onDelete={user => setDeleteConfirm(user)}
            />
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div
            className="fixed top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl border p-6 w-80 shadow-xl"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm mb-4 text-center" style={{ color: 'var(--ink)' }}>
              هل أنت متأكد من حذف المستخدم{' '}
              <strong>{deleteConfirm.username}</strong>؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-red-600"
              >
                حذف
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg py-2 text-sm border"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </>
      )}

      {panel.open && (
        <UserPanel
          mode={panel.mode}
          user={'user' in panel ? panel.user : undefined}
          onClose={closePanel}
          onSaved={handleSaved}
        />
      )}
    </AppShell>
  )
}
