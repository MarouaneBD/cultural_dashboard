# Editor Pillar Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to assign each EDITOR to a single department so that assigned editors only see their department card on the home page.

**Architecture:** One nullable `assignedPillarId` field is added to `User`; it is baked into the JWT at login and surfaced through the existing NextAuth session. The home page `DeptOverview` component reads it from the session and filters the department grid. The admin user panel gains a department dropdown that sends the value to the existing user PATCH/POST API routes.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL (Supabase via session-mode pooler), NextAuth v5 (JWT strategy), React Query, TypeScript

## Global Constraints

- All Arabic copy is RTL; wrap new UI containers with `dir="rtl"` where needed
- No new npm packages — use only what is already installed
- API auth pattern: `const session = await auth()` → role check → 403 if unauthorized
- `npx tsc --noEmit` must pass after every task
- Pillar IDs are the 8 string literals from `lib/departments.ts`: `'EDUCATION' | 'FAMILY_CULTURE' | 'ISLAMIC_INFO_CENTER' | 'AL_BIRR_MALE' | 'AL_BIRR_FEMALE' | 'ORPHANS' | 'SCIENTIFIC_PROGRAMS' | 'RESEARCH_PUBLICATIONS'`
- Unassigned EDITOR (`assignedPillarId === null`) sees all department cards — identical to today's behaviour
- ADMIN and VIEWER are never affected by `assignedPillarId` regardless of its value
- DB push uses the session-mode pooler: add `SESSION_URL` to `.env` (port 5432, no `pgbouncer=true`) and run `npx prisma db push`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `assignedPillarId String?` to `User` model |
| `types/next-auth.d.ts` | Modify | Add `assignedPillarId: string \| null` to `Session.user` and `JWT` |
| `auth.ts` | Modify | Pass `assignedPillarId` through `authorize → jwt → session` callbacks |
| `components/kpi/DeptOverview.tsx` | Modify | Filter department grid when session user is an assigned EDITOR |
| `components/admin/UserTable.tsx` | Modify | Add `assignedPillarId` to `UserRow`; show assignment in table |
| `components/admin/UserPanel.tsx` | Modify | Add controlled role select + conditional department dropdown |
| `app/api/admin/users/route.ts` | Modify | `GET` selects `assignedPillarId`; `POST` accepts and stores it |
| `app/api/admin/users/[id]/route.ts` | Modify | `PATCH` accepts and stores `assignedPillarId` |

---

### Task 1: Prisma schema — add assignedPillarId to User

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `User.assignedPillarId String?` available in Prisma client; consumed by Tasks 3 and 4

- [ ] **Step 1: Read `prisma/schema.prisma` and add the field**

Open `prisma/schema.prisma`. Find the `User` model. Add one line after `createdAt`:

```prisma
model User {
  id                 String    @id @default(cuid())
  username           String    @unique
  name               String?
  passwordHash       String
  role               UserRole  @default(VIEWER)
  mustChangePassword Boolean   @default(true)
  assignedPillarId   String?
  createdAt          DateTime  @default(now())
  comments           Comment[]
}
```

- [ ] **Step 2: Push schema to database**

```bash
cd "C:/Users/marwa/OneDrive/Documents/Projects/Cultural_Dashboard"
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

If you get a P1001 error, add `SESSION_URL` to `.env` (take `DATABASE_URL`, change port 6543 → 5432, remove `?pgbouncer=true`), then update `prisma.config.ts` datasource url to `process.env.SESSION_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL` and retry.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add assignedPillarId to User model"
```

---

### Task 2: Auth session — surface assignedPillarId in JWT and session

**Files:**
- Modify: `types/next-auth.d.ts`
- Modify: `auth.ts`

**Interfaces:**
- Consumes: `User.assignedPillarId String?` from Task 1
- Produces: `session.user.assignedPillarId: string | null` available to all client components via `useSession()`

- [ ] **Step 1: Update `types/next-auth.d.ts`**

Replace the entire file with:

```typescript
import type { UserRole } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      role: UserRole
      mustChangePassword: boolean
      assignedPillarId: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    role: UserRole
    mustChangePassword: boolean
    assignedPillarId: string | null
  }
}
```

- [ ] **Step 2: Update `auth.ts`**

Replace the entire file with:

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import { authConfig } from './auth.config'
import type { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'اسم المستخدم' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const username = credentials?.username as string | undefined
          const password = credentials?.password as string | undefined
          if (!username || !password) return null

          const user = await prisma.user.findUnique({ where: { username } })
          if (!user) return null

          const valid = await verifyPassword(password, user.passwordHash)
          if (!valid) return null

          return {
            id: user.id,
            username: user.username,
            name: user.name ?? undefined,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            assignedPillarId: user.assignedPillarId ?? null,
          }
        } catch (err) {
          console.error('[authorize] error:', err)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.username = (user as any).username
        token.role = (user as any).role as UserRole
        token.mustChangePassword = (user as any).mustChangePassword as boolean
        token.assignedPillarId = (user as any).assignedPillarId as string | null
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.role = token.role as UserRole
      session.user.mustChangePassword = token.mustChangePassword as boolean
      session.user.assignedPillarId = token.assignedPillarId as string | null
      return session
    },
  },
})
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add types/next-auth.d.ts auth.ts
git commit -m "feat: add assignedPillarId to JWT and session"
```

---

### Task 3: DeptOverview — filter cards for assigned editors

**Files:**
- Modify: `components/kpi/DeptOverview.tsx`

**Interfaces:**
- Consumes: `session.user.role` and `session.user.assignedPillarId` from Task 2 via `useSession()`
- Consumes: `DEPARTMENTS` array from `@/lib/departments` (existing)

- [ ] **Step 1: Update `components/kpi/DeptOverview.tsx`**

Replace the entire file with:

```typescript
'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DEPARTMENTS } from '@/lib/departments'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

function DeptCard({
  dept,
  kpis,
}: {
  dept: typeof DEPARTMENTS[number]
  kpis: KpiWithVariance[]
}) {
  const hasKpis = kpis.length > 0
  const color = dept.color

  const avgPct = hasKpis
    ? kpis.reduce((sum, k) => sum + k.variance.pct, 0) / kpis.length
    : 0

  const sparklineData = hasKpis
    ? kpis.slice(-4).map(k => k.variance.pct)
    : []

  const fillPct = Math.min(Math.max(avgPct, 0), 100)

  return (
    <Link
      href={`/dashboard?pillar=${dept.id}`}
      className="block rounded-2xl border transition-all hover:-translate-y-[3px] flex flex-col gap-3 p-5"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${color}`,
        boxShadow: 'var(--card-shadow)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow)')}
    >
      {/* Header: icon + dept name */}
      <div className="flex items-start justify-between gap-2">
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{dept.icon}</span>
        <p
          className="font-cairo text-[13px] font-semibold leading-snug text-right"
          style={{ color: 'var(--ink)' }}
        >
          {dept.labelAr}
        </p>
      </div>

      {/* Body: sparkline + big % (only when real data exists) */}
      <div className="flex items-end justify-between gap-2">
        <div className="h-10 flex-shrink-0" style={{ width: '88px' }}>
          {sparklineData.length > 0
            ? <SparklineChart data={sparklineData} color={color} />
            : <div className="w-full h-full rounded" style={{ background: `${color}18` }} />
          }
        </div>
        <p
          className="font-fraunces font-medium leading-none flex-shrink-0"
          style={{ fontSize: '36px', color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {hasKpis ? `${avgPct.toFixed(0)}%` : '—'}
        </p>
      </div>

      {/* Footer: progress bar + KPI count */}
      <div className="flex flex-col gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--hair)' }}>
        <div className="flex items-center justify-between">
          <span className="font-jb text-[11px] font-medium" style={{ color }}>
            {hasKpis ? `${avgPct.toFixed(1)}%` : '—'}
          </span>
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            {hasKpis ? `${kpis.length} نشاط` : 'لا توجد بيانات'}
          </span>
        </div>

        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--hair)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${fillPct}%`, background: color, transition: 'width .4s ease' }}
          />
        </div>
      </div>
    </Link>
  )
}

export function DeptOverview() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'
  const { data: session, status } = useSession()

  const { data: kpis, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const byDept = Object.fromEntries(
    DEPARTMENTS.map(d => [d.id, (kpis ?? []).filter(k => k.pillar === d.id)])
  )

  // Assigned EDITOR sees only their department; everyone else sees all
  const role = status !== 'loading' ? (session?.user as any)?.role as string | undefined : undefined
  const assignedPillarId = (session?.user as any)?.assignedPillarId as string | null | undefined
  const visibleDepts = (role === 'EDITOR' && assignedPillarId)
    ? DEPARTMENTS.filter(d => d.id === assignedPillarId)
    : DEPARTMENTS

  return (
    <div>
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-4"
        style={{ color: 'var(--ink-muted)' }}
      >
        الإدارات
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleDepts.map(dept => (
          <DeptCard
            key={dept.id}
            dept={dept}
            kpis={isLoading ? [] : (byDept[dept.id] ?? [])}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/kpi/DeptOverview.tsx
git commit -m "feat: filter dept cards for assigned editors"
```

---

### Task 4: Admin UI + API — assignment dropdown and backend support

**Files:**
- Modify: `components/admin/UserTable.tsx`
- Modify: `components/admin/UserPanel.tsx`
- Modify: `app/api/admin/users/route.ts`
- Modify: `app/api/admin/users/[id]/route.ts`

**Interfaces:**
- Consumes: `DEPARTMENTS` from `@/lib/departments` for dropdown options
- Produces: `UserRow.assignedPillarId: string | null`; API GET/POST/PATCH all handle `assignedPillarId`

- [ ] **Step 1: Update `components/admin/UserTable.tsx`**

Replace the entire file with:

```typescript
'use client'

import type { UserRole } from '@prisma/client'
import { DEPT_MAP } from '@/lib/departments'

export interface UserRow {
  id: string
  username: string
  name: string | null
  role: UserRole
  mustChangePassword: boolean
  assignedPillarId: string | null
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
              {user.assignedPillarId
                ? (DEPT_MAP[user.assignedPillarId as keyof typeof DEPT_MAP]?.labelAr ?? user.assignedPillarId)
                : '—'}
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
```

- [ ] **Step 2: Update `components/admin/UserPanel.tsx`**

Replace the entire file with:

```typescript
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
```

- [ ] **Step 3: Update `app/api/admin/users/route.ts`**

Replace the entire file with:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      mustChangePassword: true,
      assignedPillarId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { username, name, role, password, assignedPillarId } = await req.json() as {
    username?: string
    name?: string
    role?: UserRole
    password?: string
    assignedPillarId?: string | null
  }

  if (!username || !password || !role) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      username,
      name: name || null,
      role,
      passwordHash,
      mustChangePassword: true,
      assignedPillarId: assignedPillarId || null,
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      mustChangePassword: true,
      assignedPillarId: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 4: Update `app/api/admin/users/[id]/route.ts`**

Replace the entire file with:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as {
    name?: string
    role?: UserRole
    newPassword?: string
    assignedPillarId?: string | null
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name || null
  if (body.role) data.role = body.role
  if (body.newPassword) {
    data.passwordHash = await hashPassword(body.newPassword)
    data.mustChangePassword = true
  }
  if ('assignedPillarId' in body) data.assignedPillarId = body.assignedPillarId || null

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      mustChangePassword: true,
      assignedPillarId: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id } = await params

  // Prevent admin from deleting their own account
  if (id === session.user.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add components/admin/UserTable.tsx components/admin/UserPanel.tsx \
  app/api/admin/users/route.ts "app/api/admin/users/[id]/route.ts"
git commit -m "feat: add department assignment to admin user management"
```

---

## Important Note — Session Refresh

`assignedPillarId` is baked into the JWT at login. If an admin changes an editor's assignment, the editor must **re-login** for the change to take effect in their session. This is expected behaviour with JWT strategy and requires no additional implementation.
