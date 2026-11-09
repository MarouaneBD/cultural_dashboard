# EDITOR Sector Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock each EDITOR to their assigned department and sector — wrong-sector pages are unreachable, login lands them directly on their sector homepage, and unassigned EDITORs see a "contact admin" page.

**Architecture:** A pure helper function `lib/editor-access.ts` encapsulates the redirect logic (testable with Jest). `middleware.ts` calls it and issues the actual `NextResponse.redirect`. A new `/no-access` page handles EDITORs with no pillar assignment. `DashboardContent` already hides other department cards at the component level — that is verified and hardened to DOM-removal rather than CSS-only hiding.

**Tech Stack:** Next.js App Router middleware, next-auth JWT (session.user.assignedPillarId), existing `DEPARTMENTS` config from `lib/departments.ts`.

## Global Constraints

- RBAC enforced server-side — the middleware is the enforcement layer
- Arabic-first: all user-visible strings are Arabic
- No new dependencies
- `session.user.assignedPillarId` is `string | null` (typed in `types/next-auth.d.ts`)
- `DEPARTMENTS` config in `lib/departments.ts` is the source of truth for pillar→division mapping
- `/no-access` route must NOT trigger the EDITOR redirect loop — guard must skip it
- Middleware runs on all routes matched by `config.matcher` (currently excludes `/api/` and static assets)
- ADMIN and VIEWER must be completely unaffected by the new logic

---

## File Map

| File | Change |
|------|--------|
| `lib/editor-access.ts` | **Create** — pure redirect-decision function |
| `lib/editor-access.test.ts` | **Create** — unit tests |
| `middleware.ts` | **Modify** — call `getEditorRedirect`, issue redirect |
| `app/no-access/page.tsx` | **Create** — "contact admin" page for unassigned EDITORs |
| `components/kpi/DeptOverview.tsx` | **Verify/modify** — confirm other department cards are removed from DOM |

---

### Task 1: Pure redirect-decision helper + tests

**Files:**
- Create: `lib/editor-access.ts`
- Create: `lib/editor-access.test.ts`

**Interfaces:**
- Produces: `getEditorRedirect(pathname, searchParams, assignedPillarId): string | null`
  - Returns the redirect path string (e.g. `'/dashboard?division=CULTURE_RESEARCH'`) or `null` if no redirect is needed
  - Returns `'/no-access'` when `assignedPillarId` is null/empty
  - Returns `'/dashboard?division=X'` when pillar or division param doesn't match
  - Returns `null` when the path is already correct or is `/no-access`

- [ ] **Step 1: Write the failing tests**

Create `lib/editor-access.test.ts`:

```ts
import { getEditorRedirect } from './editor-access'

function params(obj: Record<string, string>) {
  return new URLSearchParams(obj)
}

describe('getEditorRedirect', () => {
  const ASSIGNED = 'EDUCATION' // EDUCATION is in CULTURE_RESEARCH division

  it('returns /no-access when assignedPillarId is null', () => {
    expect(getEditorRedirect('/dashboard', params({}), null)).toBe('/no-access')
  })

  it('returns /no-access when assignedPillarId is empty string', () => {
    expect(getEditorRedirect('/dashboard', params({}), '')).toBe('/no-access')
  })

  it('returns sector home when bare /dashboard with no params', () => {
    expect(getEditorRedirect('/dashboard', params({}), ASSIGNED))
      .toBe('/dashboard?division=CULTURE_RESEARCH')
  })

  it('returns null when already on correct sector homepage', () => {
    expect(getEditorRedirect('/dashboard', params({ division: 'CULTURE_RESEARCH' }), ASSIGNED))
      .toBeNull()
  })

  it('returns null when on own department page', () => {
    expect(getEditorRedirect('/dashboard', params({ pillar: 'EDUCATION', division: 'CULTURE_RESEARCH' }), ASSIGNED))
      .toBeNull()
  })

  it('returns sector home when accessing wrong pillar in same division', () => {
    expect(getEditorRedirect('/dashboard', params({ pillar: 'ORPHANS', division: 'CULTURE_RESEARCH' }), ASSIGNED))
      .toBe('/dashboard?division=CULTURE_RESEARCH')
  })

  it('returns sector home when accessing wrong division', () => {
    expect(getEditorRedirect('/dashboard', params({ division: 'INSTITUTIONAL_SUPPORT' }), ASSIGNED))
      .toBe('/dashboard?division=CULTURE_RESEARCH')
  })

  it('returns null for /no-access path (no redirect loop)', () => {
    expect(getEditorRedirect('/no-access', params({}), null)).toBeNull()
  })

  it('returns null for non-dashboard paths (upload, etc.)', () => {
    expect(getEditorRedirect('/upload', params({}), ASSIGNED)).toBeNull()
  })

  it('handles INSTITUTIONAL_SUPPORT assignment correctly', () => {
    expect(getEditorRedirect('/dashboard', params({}), 'HR_MANAGEMENT'))
      .toBe('/dashboard?division=INSTITUTIONAL_SUPPORT')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/editor-access.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './editor-access'`

- [ ] **Step 3: Implement `lib/editor-access.ts`**

```ts
import { DEPARTMENTS } from '@/lib/departments'

/**
 * Decides whether an EDITOR should be redirected based on their assigned pillar
 * and the page they are requesting.
 *
 * Returns a redirect path string, or null if no redirect is needed.
 * Only applies to /dashboard paths — all other paths return null.
 */
export function getEditorRedirect(
  pathname: string,
  searchParams: URLSearchParams,
  assignedPillarId: string | null | undefined,
): string | null {
  // Never redirect from the no-access page itself (would create a loop)
  if (pathname === '/no-access') return null

  // Only intercept dashboard routes
  if (!pathname.startsWith('/dashboard')) return null

  // No pillar assigned → send to no-access page
  if (!assignedPillarId) return '/no-access'

  const dept = DEPARTMENTS.find(d => d.id === assignedPillarId)
  if (!dept) return '/no-access' // unknown pillar — treat as unassigned

  const assignedDivision = dept.division
  const sectorHome = `/dashboard?division=${assignedDivision}`

  const pillarParam = searchParams.get('pillar')
  const divisionParam = searchParams.get('division')

  // Trying to access a different pillar
  if (pillarParam && pillarParam !== assignedPillarId) return sectorHome

  // Trying to access a different division
  if (divisionParam && divisionParam !== assignedDivision) return sectorHome

  // Bare /dashboard with no params → send to their sector
  if (!divisionParam && !pillarParam) return sectorHome

  // Already on the right path
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/editor-access.test.ts --no-coverage
```

Expected: 10 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add lib/editor-access.ts lib/editor-access.test.ts
git commit -m "feat(auth): EDITOR redirect helper with full test coverage"
```

---

### Task 2: Wire helper into middleware + create /no-access page

**Files:**
- Modify: `middleware.ts`
- Create: `app/no-access/page.tsx`

**Interfaces:**
- Consumes: `getEditorRedirect` from `lib/editor-access.ts` (from Task 1)

- [ ] **Step 1: Write the failing test (manual verification spec)**

There is no Jest-testable unit here (middleware uses Edge-only APIs). Instead, write a comment-based test spec at the top of your changes listing what you will manually verify at the end of the step. The automated test coverage lives entirely in `lib/editor-access.test.ts` (Task 1).

- [ ] **Step 2: Modify `middleware.ts`**

Add the import at the top:
```ts
import { getEditorRedirect } from '@/lib/editor-access'
```

Insert this block **after** the VIEWER upload block and **before** `return NextResponse.next()`:

```ts
  // EDITOR sector access control
  if (session.user.role === 'EDITOR') {
    const redirect = getEditorRedirect(
      pathname,
      req.nextUrl.searchParams,
      session.user.assignedPillarId,
    )
    if (redirect) return NextResponse.redirect(new URL(redirect, req.url))
  }
```

The complete `middleware.ts` after the edit (full file for reference):

```ts
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'
import { getEditorRedirect } from '@/lib/editor-access'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isAuthPage = pathname === '/login' || pathname === '/change-password' || pathname === '/forgot-password'

  // Not logged in → allow auth pages, redirect everything else to login
  if (!session) {
    if (isAuthPage) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Already logged in → skip login page
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Must change password → force redirect (unless already there or calling an API)
  if (session.user.mustChangePassword && pathname !== '/change-password' && !pathname.startsWith('/api/')) {
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

  // EDITOR sector access control
  if (session.user.role === 'EDITOR') {
    const redirect = getEditorRedirect(
      pathname,
      req.nextUrl.searchParams,
      session.user.assignedPillarId,
    )
    if (redirect) return NextResponse.redirect(new URL(redirect, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|dabs-logo.png|api/).*)',
  ],
}
```

- [ ] **Step 3: Create `app/no-access/page.tsx`**

```tsx
export default function NoAccessPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-8"
      style={{ background: 'var(--bg)', fontFamily: 'var(--font-cairo, Cairo, sans-serif)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: 'var(--bg-alt)' }}
      >
        🔒
      </div>
      <div className="flex flex-col gap-2">
        <h1
          className="font-semibold text-xl"
          style={{ color: 'var(--ink)' }}
        >
          لا تملك صلاحية الوصول
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          لم يتم تعيينك في أي إدارة — تواصل مع المسؤول لتفعيل حسابك
        </p>
      </div>
      <a
        href="/api/auth/signout?callbackUrl=/login"
        className="text-sm px-5 py-2 rounded-lg text-white"
        style={{ background: 'var(--accent)' }}
      >
        تسجيل الخروج
      </a>
    </div>
  )
}
```

- [ ] **Step 4: Run all tests to verify no regressions**

```bash
npm test
```

Expected: all existing tests pass (middleware logic is not unit-tested; test coverage via lib/editor-access.test.ts from Task 1).

- [ ] **Step 5: Commit**

```bash
git add middleware.ts app/no-access/page.tsx
git commit -m "feat(auth): wire EDITOR sector guard into middleware; add no-access page"
```

---

### Task 3: Verify DashboardContent hides other department cards from DOM

**Files:**
- Verify/modify: `components/kpi/DeptOverview.tsx`

This task verifies that the existing `visiblePillars` filter in `DeptOverview` removes cards from the DOM entirely (not CSS-only). If cards are only hidden with CSS, they can be unhidden via browser dev tools — fix to conditional render.

- [ ] **Step 1: Read `components/kpi/DeptOverview.tsx` lines 95–140**

Look for the `visiblePillars` filter and find how department cards are rendered. Check if other-pillar cards are:
- (a) Not rendered at all (`visiblePillars.map(...)` only) ← correct
- (b) Rendered but CSS-hidden (`className={isVisible ? '' : 'hidden'}`) ← must fix

- [ ] **Step 2: If (a) — no change needed**

If `DeptOverview` already maps only over `visiblePillars` and never renders hidden cards, skip to Step 4.

- [ ] **Step 3: If (b) — fix to conditional render**

Replace any pattern like:
```tsx
{allPillars.map(p => (
  <div key={p.id} className={p.id === assignedPillarId ? '' : 'hidden'}>
    <DeptCard ... />
  </div>
))}
```

With:
```tsx
{visiblePillars.map(p => (
  <DeptCard key={p.id} ... />
))}
```

Where `visiblePillars` is already the filtered array (role === 'EDITOR' && assignedPillarId ? filter to assigned only : all).

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit (only if a change was needed)**

```bash
git add components/kpi/DeptOverview.tsx
git commit -m "fix(dashboard): remove hidden dept cards from DOM for EDITOR role"
```
