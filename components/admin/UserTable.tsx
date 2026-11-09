'use client'

import type { UserRole } from '@prisma/client'
import { DEPT_MAP } from '@/lib/departments'

export interface UserRow {
  id: string
  username: string
  name: string | null
  role: UserRole
  mustChangePassword: boolean
  passwordResetRequested: boolean
  assignedPillarId: string | null
  createdAt: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
  onEdit: (_user: UserRow) => void
  onResetPassword: (_user: UserRow) => void
  onDelete: (_user: UserRow) => void
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
  return new Intl.DateTimeFormat('ar-AE-u-nu-latn', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

export function UserTable({ users, currentUserId, onEdit, onResetPassword, onDelete }: Props) {
  return (
    <>
      {/* ── Desktop table (md and above) ── */}
      <table className="hidden md:table w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>
            <th className="text-right p-3 font-medium">اسم المستخدم</th>
            <th className="text-right p-3 font-medium">الاسم</th>
            <th className="text-right p-3 font-medium">الدور</th>
            <th className="text-right p-3 font-medium">القسم المخصص</th>
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
                <RoleBadges user={user} />
              </td>
              <td className="p-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
                {user.assignedPillarId
                  ? (DEPT_MAP[user.assignedPillarId as keyof typeof DEPT_MAP]?.labelAr ?? user.assignedPillarId)
                  : '—'}
              </td>
              <td className="p-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
                {formatDateAr(user.createdAt)}
              </td>
              <td className="p-3">
                <ActionButtons user={user} currentUserId={currentUserId} onEdit={onEdit} onResetPassword={onResetPassword} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Mobile cards (below md) ── */}
      <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {users.map(user => (
          <div key={user.id} className="p-4 space-y-3" style={{ background: 'var(--card-bg)' }}>
            {/* Row 1: username + role badge */}
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {user.username}
              </span>
              <RoleBadges user={user} />
            </div>

            {/* Row 2: name + assigned dept */}
            {(user.name || user.assignedPillarId) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
                {user.name && <span>{user.name}</span>}
                {user.assignedPillarId && (
                  <span>
                    {DEPT_MAP[user.assignedPillarId as keyof typeof DEPT_MAP]?.labelAr ?? user.assignedPillarId}
                  </span>
                )}
              </div>
            )}

            {/* Row 3: date + action buttons */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                {formatDateAr(user.createdAt)}
              </span>
              <ActionButtons user={user} currentUserId={currentUserId} onEdit={onEdit} onResetPassword={onResetPassword} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function RoleBadges({ user }: { user: UserRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
        {ROLE_LABELS[user.role]}
      </span>
      {user.mustChangePassword && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
          تغيير مطلوب
        </span>
      )}
      {user.passwordResetRequested && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
          طلب إعادة تعيين
        </span>
      )}
    </span>
  )
}

interface ActionButtonsProps {
  user: UserRow
  currentUserId: string
  onEdit: (_user: UserRow) => void
  onResetPassword: (_user: UserRow) => void
  onDelete: (_user: UserRow) => void
}

function ActionButtons({ user, currentUserId, onEdit, onResetPassword, onDelete }: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label={`إجراءات ${user.username}`}>
      <button
        onClick={() => onEdit(user)}
        aria-label={`تعديل ${user.username}`}
        className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-alt)]"
        style={{ color: 'var(--ink-muted)' }}
      >
        تعديل
      </button>
      <button
        onClick={() => onResetPassword(user)}
        aria-label={`إعادة تعيين كلمة مرور ${user.username}`}
        className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-alt)]"
        style={{ color: 'var(--ink-muted)' }}
      >
        إعادة كلمة المرور
      </button>
      {user.id !== currentUserId && (
        <button
          onClick={() => onDelete(user)}
          aria-label={`حذف ${user.username}`}
          className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
        >
          حذف
        </button>
      )}
    </div>
  )
}
