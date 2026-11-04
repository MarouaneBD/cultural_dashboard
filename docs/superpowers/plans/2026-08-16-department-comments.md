# Department Analysis Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow ADMIN and EDITOR users to add, edit, and delete persistent comments on each department's analysis section, visible to all authenticated users.

**Architecture:** Three layers — (1) Prisma migration adds `Comment` model; (2) four API route handlers under `app/api/comments/` enforce role-based auth; (3) two new React components (`CommentThread`, `CommentComposer`) fetched via React Query are mounted below `InsightsPanel` in `DepartmentDashboard`.

**Tech Stack:** Next.js 16 App Router, Prisma ORM, PostgreSQL, React Query (`@tanstack/react-query`), NextAuth (`auth()` server helper), TypeScript

## Global Constraints

- All Arabic copy is RTL; use `dir="rtl"` on new UI containers
- No new npm packages — use only what is already installed
- API route auth pattern: `const session = await auth()` → role check → 403 if unauthorized
- `PillarId` type lives in `@/types` — use it as-is (string union, not Prisma enum)
- `pillarId` stored in `Comment` as a plain `String` (matches `PillarId` values: `"EDUCATION"`, `"FAMILY_CULTURE"`, etc.)
- Max comment length: 500 characters — enforced in both API and UI
- Styling follows existing card pattern: `var(--card-bg)`, `var(--border)`, `var(--card-shadow)`, `font-cairo`, `font-jb`
- `npx tsc --noEmit` must pass after every task

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `Comment` model + `User.comments` back-relation |
| `app/api/comments/route.ts` | Create | `GET` (list) + `POST` (create) handlers |
| `app/api/comments/[id]/route.ts` | Create | `PATCH` (edit) + `DELETE` handlers |
| `components/department/CommentComposer.tsx` | Create | Textarea + submit/cancel for create and edit modes |
| `components/department/CommentThread.tsx` | Create | Full comment thread — list, empty state, add button |
| `components/department/DepartmentDashboard.tsx` | Modify | Mount `<CommentThread>` below `<InsightsPanel>` |

---

### Task 1: Prisma migration — add Comment model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Comment` Prisma model with fields `id`, `pillarId`, `text`, `authorId`, `createdAt`, `updatedAt`; consumed by Tasks 2 and 3

- [ ] **Step 1: Add `Comment` model and `User` back-relation to `prisma/schema.prisma`**

Open `prisma/schema.prisma`. After the closing brace of the `User` model (line 120), add:

```prisma
model Comment {
  id        String   @id @default(cuid())
  pillarId  String
  text      String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Also add the back-relation inside the `User` model (after the `createdAt` field):

```prisma
  comments  Comment[]
```

The final `User` model block should look like:

```prisma
model User {
  id                 String    @id @default(cuid())
  username           String    @unique
  name               String?
  passwordHash       String
  role               UserRole  @default(VIEWER)
  mustChangePassword Boolean   @default(true)
  createdAt          DateTime  @default(now())
  comments           Comment[]
}
```

- [ ] **Step 2: Push schema to database**

```bash
cd "C:/Users/marwa/OneDrive/Documents/Projects/Cultural_Dashboard"
npx prisma db push
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Comment model to Prisma schema"
```

---

### Task 2: API routes — GET + POST

**Files:**
- Create: `app/api/comments/route.ts`

**Interfaces:**
- Consumes: `Comment` Prisma model from Task 1; `auth()` from `@/auth`; `prisma` from `@/lib/prisma`
- Produces:
  - `GET /api/comments?pillarId=X` → `CommentResponse[]`
  - `POST /api/comments` body `{ pillarId: string; text: string }` → `CommentResponse` (201)
  - Type: `CommentResponse = { id: string; pillarId: string; text: string; createdAt: string; updatedAt: string; author: { id: string; username: string; name: string | null } }`

- [ ] **Step 1: Create `app/api/comments/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
} as const

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const pillarId = searchParams.get('pillarId')
  if (!pillarId) {
    return NextResponse.json({ error: 'pillarId مطلوب' }, { status: 400 })
  }

  const comments = await prisma.comment.findMany({
    where: { pillarId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      pillarId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      author: { select: AUTHOR_SELECT },
    },
  })

  return NextResponse.json(comments)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { pillarId, text } = await req.json() as { pillarId?: string; text?: string }

  if (!pillarId || !text?.trim()) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  if (text.trim().length > 500) {
    return NextResponse.json({ error: 'التعليق يتجاوز 500 حرف' }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: {
      pillarId,
      text: text.trim(),
      authorId: session.user.id,
    },
    select: {
      id: true,
      pillarId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      author: { select: AUTHOR_SELECT },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/comments/route.ts
git commit -m "feat: add GET and POST /api/comments route"
```

---

### Task 3: API routes — PATCH + DELETE

**Files:**
- Create: `app/api/comments/[id]/route.ts`

**Interfaces:**
- Consumes: `Comment` Prisma model (Task 1); `auth()` from `@/auth`; `prisma` from `@/lib/prisma`
- Produces:
  - `PATCH /api/comments/[id]` body `{ text: string }` → updated `CommentResponse` (same shape as Task 2)
  - `DELETE /api/comments/[id]` → `{ ok: true }` (200)

- [ ] **Step 1: Create `app/api/comments/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
} as const

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } })
  if (!comment) {
    return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 })
  }

  const isAuthor = comment.authorId === session.user.id
  const isAdmin  = session.user.role === 'ADMIN'
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { text } = await req.json() as { text?: string }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 })
  }
  if (text.trim().length > 500) {
    return NextResponse.json({ error: 'التعليق يتجاوز 500 حرف' }, { status: 400 })
  }

  const updated = await prisma.comment.update({
    where: { id: params.id },
    data: { text: text.trim() },
    select: {
      id: true,
      pillarId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      author: { select: AUTHOR_SELECT },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } })
  if (!comment) {
    return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 })
  }

  const isAuthor = comment.authorId === session.user.id
  const isAdmin  = session.user.role === 'ADMIN'
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/comments/[id]/route.ts
git commit -m "feat: add PATCH and DELETE /api/comments/[id] route"
```

---

### Task 4: CommentComposer component

**Files:**
- Create: `components/department/CommentComposer.tsx`

**Interfaces:**
- Consumes: React Query `useMutation` (already installed as `@tanstack/react-query`)
- Produces: exported `CommentComposer` component with props:
  ```typescript
  interface CommentComposerProps {
    pillarId: string
    mode: 'create' | 'edit'
    commentId?: string      // required when mode === 'edit'
    initialText?: string    // pre-filled when editing
    onDone: () => void      // called on successful submit or cancel
  }
  ```

- [ ] **Step 1: Create `components/department/CommentComposer.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface CommentComposerProps {
  pillarId: string
  mode: 'create' | 'edit'
  commentId?: string
  initialText?: string
  onDone: () => void
}

export function CommentComposer({
  pillarId,
  mode,
  commentId,
  initialText = '',
  onDone,
}: CommentComposerProps) {
  const [text, setText] = useState(initialText)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const url = mode === 'create'
        ? '/api/comments'
        : `/api/comments/${commentId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const body = mode === 'create'
        ? JSON.stringify({ pillarId, text: text.trim() })
        : JSON.stringify({ text: text.trim() })

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'حدث خطأ')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pillarId] })
      onDone()
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const remaining = 500 - text.length

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(null) }}
        maxLength={500}
        rows={3}
        placeholder="اكتب تعليقك هنا..."
        className="font-cairo text-[13px] rounded-xl p-3 resize-none w-full"
        style={{
          background: 'var(--bg-alt)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-jb text-[10px]" style={{ color: remaining < 50 ? '#dc2626' : 'var(--ink-muted)' }}>
          {remaining} حرف متبقٍ
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDone}
            className="font-cairo text-[12px] px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-alt)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
          >
            إلغاء
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!text.trim() || mutation.isPending}
            className="font-cairo text-[12px] px-4 py-1.5 rounded-lg"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              opacity: !text.trim() || mutation.isPending ? 0.5 : 1,
              cursor: !text.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {mutation.isPending ? '...' : 'إرسال'}
          </button>
        </div>
      </div>
      {error && (
        <p className="font-cairo text-[12px]" style={{ color: '#dc2626' }}>{error}</p>
      )}
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
git add components/department/CommentComposer.tsx
git commit -m "feat: add CommentComposer component (create + edit modes)"
```

---

### Task 5: CommentThread component + DepartmentDashboard integration

**Files:**
- Create: `components/department/CommentThread.tsx`
- Modify: `components/department/DepartmentDashboard.tsx`

**Interfaces:**
- Consumes:
  - `CommentComposer` from Task 4 (props: `pillarId`, `mode`, `commentId?`, `initialText?`, `onDone`)
  - `GET /api/comments?pillarId=X` → `CommentResponse[]` where:
    ```typescript
    interface CommentResponse {
      id: string
      pillarId: string
      text: string
      createdAt: string
      updatedAt: string
      author: { id: string; username: string; name: string | null }
    }
    ```
  - `DELETE /api/comments/[id]` → `{ ok: true }`
  - `useSession()` from `next-auth/react` for role + user id
- Produces: exported `CommentThread` component with props:
  ```typescript
  interface CommentThreadProps {
    pillarId: string
    accentColor: string
  }
  ```

- [ ] **Step 1: Create `components/department/CommentThread.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { CommentComposer } from './CommentComposer'

interface CommentResponse {
  id: string
  pillarId: string
  text: string
  createdAt: string
  updatedAt: string
  author: { id: string; username: string; name: string | null }
}

interface CommentThreadProps {
  pillarId: string
  accentColor: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'الآن'
  if (mins < 60)  return `منذ ${mins} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${days} يوم`
}

function Avatar({ username, color }: { username: string; color: string }) {
  return (
    <span
      className="font-jb text-[11px] font-bold flex-shrink-0 flex items-center justify-center rounded-full w-7 h-7"
      style={{ background: `${color}20`, color }}
    >
      {username[0]?.toUpperCase() ?? '؟'}
    </span>
  )
}

export function CommentThread({ pillarId, accentColor }: CommentThreadProps) {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const role = status !== 'loading' ? (session?.user as any)?.role as string | undefined : undefined
  const userId = (session?.user as any)?.id as string | undefined
  const canWrite = role === 'ADMIN' || role === 'EDITOR'

  const { data: comments = [], isLoading } = useQuery<CommentResponse[]>({
    queryKey: ['comments', pillarId],
    queryFn: () =>
      fetch(`/api/comments?pillarId=${pillarId}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status)),
    enabled: status !== 'loading',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/comments/${id}`, { method: 'DELETE' }).then(r => {
        if (!r.ok) throw new Error('فشل الحذف')
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pillarId] })
    },
  })

  return (
    <div
      dir="rtl"
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-space font-semibold text-[11px] tracking-[.1em] uppercase" style={{ color: 'var(--ink)' }}>
          تعليقات التحليل
        </span>
        {canWrite && !composerOpen && (
          <button
            onClick={() => setComposerOpen(true)}
            className="font-cairo text-[12px] px-3 py-1.5 rounded-lg"
            style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
          >
            + أضف تعليقاً
          </button>
        )}
      </div>

      {/* Composer — create mode */}
      {composerOpen && (
        <CommentComposer
          pillarId={pillarId}
          mode="create"
          onDone={() => setComposerOpen(false)}
        />
      )}

      {/* Comment list */}
      {isLoading ? (
        <p className="font-cairo text-[12px] text-center" style={{ color: 'var(--ink-muted)' }}>جاري التحميل...</p>
      ) : comments.length === 0 && !composerOpen ? (
        <p className="font-cairo text-[12px]" style={{ color: 'var(--ink-muted)' }}>لا توجد تعليقات بعد</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map(c => {
            const isAuthor = c.author.id === userId
            const canEdit   = isAuthor || role === 'ADMIN'
            const isEditing = editingId === c.id

            return (
              <li
                key={c.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--hair)',
                }}
              >
                <Avatar username={c.author.username} color={accentColor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="font-cairo text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {c.author.name ?? c.author.username}
                    </span>
                    <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                      {relativeTime(c.createdAt)}
                    </span>
                  </div>

                  {isEditing ? (
                    <CommentComposer
                      pillarId={pillarId}
                      mode="edit"
                      commentId={c.id}
                      initialText={c.text}
                      onDone={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <p className="font-cairo text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                        {c.text}
                      </p>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          {isAuthor && (
                            <button
                              onClick={() => setEditingId(c.id)}
                              className="font-jb text-[10px]"
                              style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              تعديل
                            </button>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate(c.id)}
                            className="font-jb text-[10px]"
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `CommentThread` to `DepartmentDashboard.tsx`**

Add the import at the top of `components/department/DepartmentDashboard.tsx` (after the existing imports):

```typescript
import { CommentThread } from './CommentThread'
```

Then add `<CommentThread>` after `<InsightsPanel>` in the return JSX. Replace the existing `{/* ── Insights ── */}` block:

```tsx
      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <InsightsPanel insights={insights} />

      {/* ── Comments ─────────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />
      <CommentThread pillarId={pillarId} accentColor={color} />
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "npm notice"
```

Expected: no output.

- [ ] **Step 4: Manual browser verification**

```bash
npm run dev
```

Open `http://localhost:3000`, navigate to any department page. Verify:

| Scenario | Expected |
|----------|----------|
| Logged in as VIEWER | Thread visible, "أضف تعليقاً" button absent, "لا توجد تعليقات بعد" shown when empty |
| Logged in as EDITOR — click "أضف تعليقاً" | Composer opens with textarea + إرسال + إلغاء |
| Submit a comment | Comment appears in thread with author name + relative timestamp |
| EDITOR clicks "تعديل" on own comment | Inline composer opens pre-filled with existing text |
| EDITOR tries to delete another user's comment | "حذف" button not shown |
| ADMIN sees "حذف" on any comment | Button visible regardless of author |
| Comment exceeds 500 chars | Counter turns red; API returns 400 if bypassed |

- [ ] **Step 5: Commit**

```bash
git add components/department/CommentThread.tsx components/department/DepartmentDashboard.tsx
git commit -m "feat: add CommentThread + wire into DepartmentDashboard"
```
