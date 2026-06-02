# User Management & Authentication — Design Spec
**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Add a full authentication and user management system to the Cultural Dashboard (ERS). Users log in with a username and password. An admin manages all users from a dedicated page. Role-based access controls which sidebar links are visible and which routes are accessible.

---

## 1. Data Model

Modify the existing `User` model in `prisma/schema.prisma`. Replace `email` with `username`, add `passwordHash`, and add a `mustChangePassword` flag.

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

The `UserRole` enum (already in schema) remains unchanged: `ADMIN | EDITOR | VIEWER`.

`AuditLog.userId` remains a plain `String` (stores the username). No foreign key — logs survive user deletion.

---

## 2. Authentication (Auth.js v5 — Credentials Provider)

**Library:** `next-auth` v5 with the `Credentials` provider.

**Config file:** `auth.ts` (project root) — exports `{ handlers, auth, signIn, signOut }`.

**Login page** (`/login`):
- Centered Arabic form: username + password fields
- Calls `signIn('credentials', { username, password })`
- On failure: shows Arabic error message ("اسم المستخدم أو كلمة المرور غير صحيحة")
- Redirects to `/dashboard` on success (middleware handles `mustChangePassword` redirect)

**Force password change** (`/change-password`):
- Shown when session has `mustChangePassword: true`
- Form: new password + confirm password
- On submit: PATCH `/api/user/change-password` — hashes new password, sets `mustChangePassword: false`
- Redirects to `/dashboard` on success

**Seeding the first admin** (`scripts/seed-admin.ts`):
- Reads `ADMIN_USERNAME` and `ADMIN_PASSWORD` from environment
- Hashes password with `bcrypt` (12 rounds)
- Upserts user with `role: ADMIN`, `mustChangePassword: false`
- Safe to run multiple times (upsert)
- Run via `npm run seed:admin`

---

## 3. Middleware (`middleware.ts`)

A single `middleware.ts` at the project root guards all routes:

| Condition | Action |
|-----------|--------|
| No session | Redirect to `/login` |
| Session + `mustChangePassword: true` + not on `/change-password` | Redirect to `/change-password` |
| Session + role is not `ADMIN` + accessing `/admin/*` | Redirect to `/dashboard` |
| Session + role is `VIEWER` + accessing `/upload` | Redirect to `/dashboard` |
| Session + on `/login` | Redirect to `/dashboard` |

Public routes (matcher excludes): `/login`, `/change-password`, `/api/auth/*`, `/_next/*`, `/favicon.ico`, `/dabs-logo.png`.

---

## 4. User Management Page (`/admin/users`)

**Route:** `app/admin/users/page.tsx` — server component, checks session role = ADMIN.

**Layout:** Full-width table inside `AppShell`. Table columns:

| Column | Notes |
|--------|-------|
| اسم المستخدم (username) | Plain text |
| الاسم (display name) | Plain text |
| الدور (role) | Colored badge: ADMIN=purple, EDITOR=blue, VIEWER=gray |
| تاريخ الإنشاء (created) | Arabic date format |
| الإجراءات (actions) | Edit · Reset Password · Delete |

**Create user:** Slide-in panel (right side, RTL). Fields: username, display name, role dropdown, initial password. New users get `mustChangePassword: true` automatically.

**Edit user:** Same slide-in panel pre-filled. Username is read-only after creation. Can change: display name, role.

**Reset password:** Admin sets a new temporary password. Sets `mustChangePassword: true` on that user.

**Delete user:** Requires confirmation. The currently logged-in admin cannot delete their own account.

**API routes** (`app/api/admin/users/`):

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| PATCH | `/api/admin/users/[id]` | Update name/role or reset password |
| DELETE | `/api/admin/users/[id]` | Delete user |

All four routes verify `session.user.role === 'ADMIN'` server-side. The UI hiding is cosmetic only — the API is the real gate.

---

## 5. Role-Gated Sidebar

`AppShell` reads the session server-side and passes the role to `Sidebar` as a prop. `Sidebar` renders footer links conditionally:

| Link | ADMIN | EDITOR | VIEWER |
|------|-------|--------|--------|
| ⬆ رفع البيانات | ✓ | ✓ | hidden |
| 📋 سجل المراجعة | ✓ | hidden | hidden |
| 👥 إدارة المستخدمين | ✓ | hidden | hidden |

The `/admin/users` link is new — added to `FOOTER_LINKS` in `Sidebar`, conditionally rendered.

---

## 6. Session Shape

Auth.js session is extended to include `role` and `mustChangePassword`:

```ts
// types/next-auth.d.ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      name?: string | null
      role: UserRole
      mustChangePassword: boolean
    }
  }
}
```

---

## 7. Files to Create / Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify `User` model |
| `auth.ts` | Create — Auth.js config |
| `middleware.ts` | Create — route protection |
| `types/next-auth.d.ts` | Create — session type extension |
| `scripts/seed-admin.ts` | Create — first admin seeder |
| `app/login/page.tsx` | Create — login page |
| `app/change-password/page.tsx` | Create — force password change |
| `app/admin/users/page.tsx` | Create — user management table |
| `app/api/admin/users/route.ts` | Create — GET + POST |
| `app/api/admin/users/[id]/route.ts` | Create — PATCH + DELETE |
| `app/api/user/change-password/route.ts` | Create — password change endpoint |
| `components/admin/UserTable.tsx` | Create — user list table |
| `components/admin/UserPanel.tsx` | Create — create/edit slide-in panel |
| `components/layout/AppShell.tsx` | Modify — pass role to Sidebar |
| `components/layout/Sidebar.tsx` | Modify — conditional footer links + role prop |
| `package.json` | Add `seed:admin` script |

---

## 8. Dependencies to Add

- `next-auth@5` (beta) — Auth.js v5
- `bcryptjs` + `@types/bcryptjs` — password hashing
