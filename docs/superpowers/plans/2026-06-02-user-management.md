# User Management & Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username/password auth (Auth.js v5) with three roles (ADMIN/EDITOR/VIEWER), a /admin/users management page, and role-gated sidebar links.

**Architecture:** Auth.js v5 Credentials provider stores sessions in encrypted JWT cookies. Middleware at the project root guards all routes. The Sidebar reads the role client-side via `useSession()` (SessionProvider added to existing providers.tsx) and conditionally renders footer links.

**Tech Stack:** next-auth@beta, bcryptjs, Prisma 7, Next.js 16 App Router, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Replace email with username, add passwordHash + mustChangePassword |
| `lib/auth-utils.ts` | Create | hashPassword / verifyPassword pure functions |
| `lib/auth-utils.test.ts` | Create | Tests for the above |
| `auth.ts` | Create | Auth.js config: credentials provider, JWT + session callbacks |
| `types/next-auth.d.ts` | Create | Extend Session/JWT types with role, username, mustChangePassword |
| `app/api/auth/[...nextauth]/route.ts` | Create | Auth.js route handler (GET + POST) |
| `middleware.ts` | Create | Route protection: unauthenticated → /login, mustChangePassword → /change-password, RBAC |
| `components/providers.tsx` | Modify | Add SessionProvider wrapper |
| `app/login/page.tsx` | Create | Arabic login form |
| `app/change-password/page.tsx` | Create | Force-change-password form |
| `app/api/user/change-password/route.ts` | Create | PATCH — hash new password, clear mustChangePassword flag |
| `app/api/admin/users/route.ts` | Create | GET (list) + POST (create) — ADMIN only |
| `app/api/admin/users/[id]/route.ts` | Create | PATCH (edit/reset-pw) + DELETE — ADMIN only |
| `components/admin/UserTable.tsx` | Create | User list table with action buttons |
| `components/admin/UserPanel.tsx` | Create | Slide-in panel: create / edit user form |
| `app/admin/users/page.tsx` | Create | /admin/users page shell |
| `components/layout/Sidebar.tsx` | Modify | Role-gated footer links via useSession() |
| `scripts/seed-admin.ts` | Create | Upsert first ADMIN from env vars |
| `package.json` | Modify | Add seed:admin script |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install next-auth, bcryptjs**

```bash
npm install next-auth@beta bcryptjs
npm install --save-dev @types/bcryptjs
```

Expected output ends with: `added N packages`

- [ ] **Step 2: Verify installs**

```bash
node -e "require('bcryptjs'); console.log('bcryptjs ok')"
```

Expected: `bcryptjs ok`

- [ ] **Step 3: Set AUTH_SECRET in .env**

Add to `.env` (append — do not overwrite existing lines):

```
AUTH_SECRET="replace-with-32-plus-char-random-string"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="Admin@1234"
```

Generate a real secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Replace the placeholder value in `.env` with the output.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env
git commit -m "chore: add next-auth and bcryptjs dependencies"
```

---

## Task 2: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace the User model**

In `prisma/schema.prisma`, replace the existing `User` model (lines 104–109) with:

```prisma
model User {
  id                 String    @id @default(cuid())
  username           String    @unique
  name               String?
  passwordHash       String
  role               UserRole  @default(VIEWER)
  mustChangePassword Boolean   @default(true)
  createdAt          DateTime  @default(now())
}
```

- [ ] **Step 2: Push schema to DB**

```bash
npx prisma db push
```

Expected output includes: `Your database is now in sync with your Prisma schema`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: update User model — username+passwordHash+mustChangePassword"
```

---

## Task 3: Auth utilities (TDD)

**Files:**
- Create: `lib/auth-utils.ts`
- Create: `lib/auth-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/auth-utils.test.ts`:

```ts
import { hashPassword, verifyPassword } from './auth-utils'

describe('hashPassword', () => {
  it('returns a bcrypt hash different from the input', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('produces different hashes for the same input (salt)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('correct', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx jest lib/auth-utils.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './auth-utils'`

- [ ] **Step 3: Implement auth-utils**

Create `lib/auth-utils.ts`:

```ts
import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx jest lib/auth-utils.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth-utils.ts lib/auth-utils.test.ts
git commit -m "feat: add hashPassword/verifyPassword utilities"
```

---

## Task 4: Auth.js config + session types

**Files:**
- Create: `auth.ts`
- Create: `types/next-auth.d.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create session type extension**

Create `types/next-auth.d.ts`:

```ts
import type { UserRole } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      role: UserRole
      mustChangePassword: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    role: UserRole
    mustChangePassword: boolean
  }
}
```

- [ ] **Step 2: Create auth.ts**

Create `auth.ts` at the project root:

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'اسم المستخدم' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
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
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.username = token.username
      session.user.role = token.role
      session.user.mustChangePassword = token.mustChangePassword
      return session
    },
  },
})
```

- [ ] **Step 3: Create Auth.js route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to `auth.ts` or `types/next-auth.d.ts`

- [ ] **Step 5: Commit**

```bash
git add auth.ts types/next-auth.d.ts app/api/auth/
git commit -m "feat: add Auth.js config with credentials provider and session types"
```

---

## Task 5: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

Create `middleware.ts` at the project root:

```ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Not logged in → login page
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Already logged in + visiting /login → dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Must change password → force redirect (unless already there)
  if (session.user.mustChangePassword && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url))
  }

  // Non-admin trying to access /admin/* routes
  if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // VIEWER trying to access /upload
  if (pathname.startsWith('/upload') && session.user.role === 'VIEWER') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|dabs-logo.png|api/auth).*)',
  ],
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors in `middleware.ts`

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Auth.js middleware — route protection + RBAC redirects"
```

---

## Task 6: Add SessionProvider + login page

**Files:**
- Modify: `components/providers.tsx`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Add SessionProvider to providers.tsx**

In `components/providers.tsx`, update to:

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000 } },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </SessionProvider>
  )
}
```

- [ ] **Step 2: Create login page**

Create `app/login/page.tsx`:

```tsx
'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      username: form.get('username') as string,
      password: form.get('password') as string,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-center font-semibold text-lg mb-6" style={{ color: 'var(--ink)' }}>
          تسجيل الدخول
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              اسم المستخدم
            </label>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--bg-alt)',
                borderColor: 'var(--border)',
                color: 'var(--ink)',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              كلمة المرور
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--bg-alt)',
                borderColor: 'var(--border)',
                color: 'var(--ink)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'جارٍ التحقق…' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add components/providers.tsx app/login/page.tsx
git commit -m "feat: add SessionProvider and Arabic login page"
```

---

## Task 7: Force-change-password page + API route

**Files:**
- Create: `app/change-password/page.tsx`
- Create: `app/api/user/change-password/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/user/change-password/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { newPassword } = await req.json() as { newPassword?: string }
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, mustChangePassword: false },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create the page**

Create `app/change-password/page.tsx`:

```tsx
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = new FormData(e.currentTarget)
    const newPassword = form.get('newPassword') as string
    const confirm = form.get('confirm') as string

    if (newPassword !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    const res = await fetch('/api/user/change-password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'حدث خطأ')
      return
    }

    // Re-sign in to refresh the JWT (mustChangePassword is now false)
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-center font-semibold text-lg mb-2" style={{ color: 'var(--ink)' }}>
          تغيير كلمة المرور
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
          يجب عليك تغيير كلمة المرور قبل المتابعة
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              كلمة المرور الجديدة
            </label>
            <input
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              تأكيد كلمة المرور
            </label>
            <input
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/change-password/page.tsx app/api/user/change-password/route.ts
git commit -m "feat: add force-change-password page and API route"
```

---

## Task 8: Admin users API routes

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Create GET + POST route**

Create `app/api/admin/users/route.ts`:

```ts
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
    select: { id: true, username: true, name: true, role: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { username, name, role, password } = await req.json() as {
    username?: string
    name?: string
    role?: UserRole
    password?: string
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
    data: { username, name: name || null, role, passwordHash, mustChangePassword: true },
    select: { id: true, username: true, name: true, role: true, mustChangePassword: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Create PATCH + DELETE route**

Create `app/api/admin/users/[id]/route.ts`:

```ts
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
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name || null
  if (body.role) data.role = body.role
  if (body.newPassword) {
    data.passwordHash = await hashPassword(body.newPassword)
    data.mustChangePassword = true
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, mustChangePassword: true, createdAt: true },
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

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/users/
git commit -m "feat: add admin users API — GET/POST/PATCH/DELETE with ADMIN guard"
```

---

## Task 9: UserTable and UserPanel components

**Files:**
- Create: `components/admin/UserTable.tsx`
- Create: `components/admin/UserPanel.tsx`

- [ ] **Step 1: Create UserTable**

Create `components/admin/UserTable.tsx`:

```tsx
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
```

- [ ] **Step 2: Create UserPanel**

Create `components/admin/UserPanel.tsx`:

```tsx
'use client'

import { useState, useEffect, FormEvent } from 'react'
import type { UserRole } from '@prisma/client'
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
        }),
      })
    } else if (mode === 'edit') {
      res = await fetch(`/api/admin/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name') || undefined,
          role: form.get('role'),
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
                  defaultValue={user?.role ?? 'VIEWER'}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
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

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/admin/
git commit -m "feat: add UserTable and UserPanel components"
```

---

## Task 10: /admin/users page

**Files:**
- Create: `app/admin/users/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/admin/users/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/admin/users/page.tsx
git commit -m "feat: add /admin/users management page"
```

---

## Task 11: Role-gated Sidebar

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar to use useSession and conditionally render footer links**

In `components/layout/Sidebar.tsx`, replace the file contents with:

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DEPARTMENTS } from '@/lib/departments'

const PILLARS = DEPARTMENTS.map(d => ({
  href: `/dashboard?pillar=${d.id}`,
  labelAr: d.labelAr,
  icon: d.icon,
}))

const LOGO_PATH = '/dabs-logo.png'

const WIDTH_EXPANDED = '210px'
const WIDTH_COLLAPSED = '60px'

interface SidebarProps {
  expanded: boolean
}

export function Sidebar({ expanded }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activePillar = searchParams.get('pillar')
  const { data: session } = useSession()
  const role = session?.user?.role

  return (
    <aside
      aria-label="الشريط الجانبي"
      className={[
        'min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0',
        'fixed inset-y-0 start-0 z-40',
        'md:relative md:inset-auto md:z-auto',
        !expanded ? 'hidden md:flex' : 'flex',
      ].join(' ')}
      style={{
        background: 'var(--sidebar-bg)',
        width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED,
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand / Logo ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b border-white/[.07] flex items-center justify-center overflow-hidden"
        style={{ padding: expanded ? '16px 14px 14px' : '14px 10px', minHeight: '80px' }}
      >
        {expanded ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div
              className="w-full rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: 'rgba(255,255,255,.95)',
                height: '56px',
                boxShadow: '0 2px 10px rgba(0,0,0,.22)',
              }}
            >
              <Image
                src={LOGO_PATH}
                alt="شعار المنظمة"
                width={150}
                height={48}
                className="object-contain"
                style={{ maxHeight: '44px', width: 'auto' }}
              />
            </div>
            <div className="text-center">
              <div className="font-space font-semibold text-[12px] text-white/88 flex items-center justify-center gap-1.5">
                قطاع الثقافة
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
              </div>
              <div className="text-[9.5px] text-white/38 mt-0.5">لوحة تحكم</div>
            </div>
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,.92)',
              boxShadow: '0 1px 6px rgba(0,0,0,.20)',
            }}
          >
            <Image
              src={LOGO_PATH}
              alt="شعار المنظمة"
              width={32}
              height={32}
              className="object-contain"
              style={{ maxHeight: '28px', width: 'auto' }}
            />
          </div>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav
        className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
        style={{ padding: expanded ? '10px 8px' : '10px 6px' }}
        aria-label="القائمة الرئيسية"
      >
        <NavLink
          href="/dashboard"
          icon="◈"
          label="الرئيسية"
          active={pathname === '/dashboard' && !activePillar}
          expanded={expanded}
        />

        {expanded ? (
          <p
            className="font-space font-semibold tracking-[.12em] uppercase text-[9px] px-2 pt-2.5 pb-1"
            style={{ color: 'rgba(255,255,255,.25)', whiteSpace: 'nowrap' }}
          >
            الإدارات
          </p>
        ) : (
          <div className="my-1 mx-1 border-t border-white/[.08]" />
        )}

        {PILLARS.map(p => (
          <NavLink
            key={p.href}
            href={p.href}
            icon={p.icon}
            label={p.labelAr}
            active={activePillar === p.href.split('=')[1]}
            expanded={expanded}
          />
        ))}
      </nav>

      {/* ── Footer (role-gated) ───────────────────────────── */}
      <div
        className="border-t border-white/[.06] flex flex-col gap-0.5 flex-shrink-0"
        style={{ padding: expanded ? '8px 8px' : '8px 6px' }}
      >
        {(role === 'ADMIN' || role === 'EDITOR') && (
          <NavLink
            href="/upload"
            icon="⬆"
            label="رفع البيانات"
            active={pathname === '/upload'}
            expanded={expanded}
          />
        )}
        {role === 'ADMIN' && (
          <>
            <NavLink
              href="/admin/audit"
              icon="📋"
              label="سجل المراجعة"
              active={pathname === '/admin/audit'}
              expanded={expanded}
            />
            <NavLink
              href="/admin/users"
              icon="👥"
              label="إدارة المستخدمين"
              active={pathname === '/admin/users'}
              expanded={expanded}
            />
          </>
        )}
      </div>
    </aside>
  )
}

interface NavLinkProps {
  href: string
  icon: string
  label: string
  active: boolean
  expanded: boolean
}

function NavLink({ href, icon, label, active, expanded }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? label : undefined}
      className="flex items-center rounded-lg text-[12.5px] transition-colors"
      style={{
        gap: expanded ? '9px' : '0',
        padding: expanded ? '7px 10px' : '8px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)',
        background: active ? 'rgba(255,255,255,.10)' : 'transparent',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,.06)'
          e.currentTarget.style.color = 'rgba(255,255,255,.85)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,.55)'
        }
      }}
    >
      <span style={{ fontSize: '15px', opacity: active ? 1 : 0.75, flexShrink: 0 }}>{icon}</span>
      {expanded && <span className="truncate">{label}</span>}
    </Link>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: role-gated sidebar footer — upload/audit/users links by role"
```

---

## Task 12: Seed-admin script

**Files:**
- Create: `scripts/seed-admin.ts`
- Modify: `package.json`

- [ ] **Step 1: Create seed-admin script**

Create `scripts/seed-admin.ts`:

```ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env')
  }

  const adapter = new PrismaPg({ connectionString: url })
  const prisma = new PrismaClient({ adapter })

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.upsert({
      where: { username },
      update: { passwordHash, role: 'ADMIN', mustChangePassword: false },
      create: { username, passwordHash, role: 'ADMIN', mustChangePassword: false },
    })
    console.log(`✓ Admin seeded: ${user.username} (id: ${user.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add seed:admin script to package.json**

In `package.json`, add to the `"scripts"` block:

```json
"seed:admin": "tsx scripts/seed-admin.ts"
```

The scripts block should look like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "test": "jest",
  "db:seed": "tsx prisma/seed.ts",
  "seed:admin": "tsx scripts/seed-admin.ts"
},
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-admin.ts package.json
git commit -m "feat: add seed:admin script — upsert first admin from env vars"
```

---

## Task 13: End-to-end smoke test

This task verifies the full flow works with a running database.

- [ ] **Step 1: Start the database**

```bash
docker compose up -d
```

Wait until healthy:
```bash
docker compose ps
```
Expected: `STATUS` shows `healthy` or `Up`

- [ ] **Step 2: Push schema and seed admin**

```bash
npx prisma db push
npm run seed:admin
```

Expected output of seed: `✓ Admin seeded: admin (id: ...)`

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

- [ ] **Step 4: Verify login flow**
  - Open http://localhost:3000 — should redirect to `/login`
  - Log in with `admin` / `Admin@1234` (from `.env`)
  - Should land on `/dashboard`
  - Sidebar footer should show: ⬆ رفع البيانات · 📋 سجل المراجعة · 👥 إدارة المستخدمين

- [ ] **Step 5: Verify user management**
  - Navigate to `/admin/users`
  - Create a VIEWER user (`viewer1` / `pass1234`)
  - Log out (clear cookies or use browser incognito)
  - Log in as `viewer1`
  - Should be forced to `/change-password`
  - Change password → should land on `/login`, then log in with new password
  - Sidebar footer should show NO links (VIEWER)
  - Visiting `/upload` directly should redirect to `/dashboard`

- [ ] **Step 6: Final type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no errors

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests pass (including new `lib/auth-utils.test.ts`)
