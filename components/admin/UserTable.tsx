'use client'

import type { UserRole } from '@prisma/client'

export interface UserRow {
  id: string
  username: string
  name: string | null
  role: UserRole
  mustChangePassword: boolean
  createdAt: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
  onEdit: (user: UserRow) => void
  onResetPassword: (user: UserRow) => void
  onDelete: (user: UserRow) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'مدير',
  EDITOR: 'محرر',
  VIEWER: 'مشاهد',
}

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-600',
}

function formatDateAr(iso: string) {
  return new Intl.DateTimeFormat('ar-AE', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

export function UserTable({ users, currentUserId, onEdit, onResetPassword, onDelete }: Props) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>
          <th className="text-right p-3 font-medium">اسم المستخدم</th>
          <th className="text-right p-3 font-medium">الاسم</th>
          <th className="text-right p-3 font-medium">الدور</th>
          <th className="text-right p-3 font-medium">تاريخ الإنشاء</th>
          <th className="text-right p-3 font-medium">الإجراءات</th>
        </tr>
      </thead>
      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {users.map(user => (
          <tr key={user.id} className="hover:bg-[var(--bg-alt)] transition-colors">
            <td className="p-3 font-mono text-xs">{user.username}</td>
            <td className="p-3">{user.name ?? '—'}</td>
            <td className="p-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              {user.mustChangePassword && (
                <span className="mr-2 inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                  تغيير مطلوب
                </span>
              )}
            </td>
            <td className="p-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
              {formatDateAr(user.createdAt)}
            </td>
            <td className="p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-alt)]"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  تعديل
                </button>
                <button
                  onClick={() => onResetPassword(user)}
                  className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-alt)]"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  إعادة كلمة المرور
                </button>
                {user.id !== currentUserId && (
                  <button
                    onClick={() => onDelete(user)}
                    className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
