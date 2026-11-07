# EDITOR Sector Routing — Design Spec

**Goal:** Lock each EDITOR to their assigned department and sector — wrong-sector pages are unreachable, and login lands them directly on their sector homepage.

**Architecture:** Enforcement lives in `middleware.ts` (server-side, JWT-based). `DashboardContent` already hides other department cards at the component level — that becomes defense-in-depth. A `/no-access` page handles the edge case of an EDITOR with no assigned pillar.

**Tech Stack:** Next.js App Router middleware, next-auth JWT, existing `DEPARTMENTS` + `DIVISIONS` config from `lib/departments.ts` / `lib/divisions.ts`.

## Global Constraints

- RBAC enforced server-side — never rely on UI gating alone
- Arabic-first: all user-visible strings are Arabic
- No new dependencies
- `assignedPillarId` on `session.user` is a string matching one of the `DEPARTMENTS[].id` values
- Division is derived at runtime from `DEPARTMENTS` config — not stored separately on the user

---

## Sub-project A1 — Middleware: redirect + guard

**File to modify:** `middleware.ts`

After the existing admin-route block, add EDITOR-specific logic:

```ts
// Derive the EDITOR's division from their assignedPillarId
if (role === 'EDITOR') {
  const assignedPillarId = token.assignedPillarId as string | null

  // No pillar assigned → send to /no-access
  if (!assignedPillarId) {
    return NextResponse.redirect(new URL('/no-access', req.url))
  }

  const dept = DEPARTMENTS.find(d => d.id === assignedPillarId)
  const assignedDivision = dept?.division

  // Trying to reach a pillar page → must be their pillar
  const pillarParam = url.searchParams.get('pillar')
  if (pillarParam && pillarParam !== assignedPillarId) {
    return NextResponse.redirect(
      new URL(`/dashboard?division=${assignedDivision}`, req.url)
    )
  }

  // Trying to reach a division page → must be their division
  const divisionParam = url.searchParams.get('division')
  if (divisionParam && divisionParam !== assignedDivision) {
    return NextResponse.redirect(
      new URL(`/dashboard?division=${assignedDivision}`, req.url)
    )
  }

  // No division param (bare /dashboard) → redirect to their sector
  if (pathname === '/dashboard' && !divisionParam && !pillarParam) {
    return NextResponse.redirect(
      new URL(`/dashboard?division=${assignedDivision}`, req.url)
    )
  }
}
```

This runs for every request to `/dashboard*`. The redirect uses `assignedDivision` derived from the `DEPARTMENTS` config — no extra DB query needed (config is static).

---

## Sub-project A2 — `/no-access` page

**File to create:** `app/no-access/page.tsx`

Simple static page, no data fetching:

```tsx
export default function NoAccessPage() {
  return (
    <div /* centered layout */>
      <p>ليس لديك صلاحية وصول — تواصل مع المسؤول</p>
      <a href="/api/auth/signout">تسجيل الخروج</a>
    </div>
  )
}
```

- No sidebar, no navigation
- Logout link pointing to `/api/auth/signout?callbackUrl=/login`
- Styled consistently with the app (same background, Cairo font)

---

## Sub-project A3 — DashboardContent: defense-in-depth card hiding

**File to modify:** `components/DashboardContent.tsx` (or wherever `DeptOverview` is called)

`DeptOverview` already filters `visiblePillars` to `assignedPillarId` for EDITORs. Verify this is correct and that clicking a hidden card is impossible (cards for other departments are not rendered, not just visually hidden).

No change needed if the existing filter already removes the card from the DOM. If it only hides visually (CSS), change to conditional render.

---

## Testing

- EDITOR with `assignedPillarId = 'EDUCATION'` logs in → lands on `/dashboard?division=CULTURE_RESEARCH`
- Same EDITOR navigates to `/dashboard?pillar=ORPHANS&division=CULTURE_RESEARCH` → redirected to `/dashboard?division=CULTURE_RESEARCH`
- Same EDITOR navigates to `/dashboard?division=INSTITUTIONAL_SUPPORT` → redirected to `/dashboard?division=CULTURE_RESEARCH`
- EDITOR with `assignedPillarId = null` → `/no-access` page
- ADMIN and VIEWER are unaffected by all new middleware logic
