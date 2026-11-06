# Engineering Review — Cultural Dashboard (ERS) — Second Pass

**Date:** 2026-11-06
**Reviewer:** Automated Second-Pass Verification Audit
**Baseline commit:** `e5e6116de940d847cc043adb21985d292e34385b` — fix: gate TLS rejectUnauthorized on env var, add .env.example (F-005)
**Head commit:** `9e506759e6c86b359f1198cab4b11f57a395d94e` — fix: add DB indexes, query limits, and raise password minimum to 8 chars
**Scope:** Read-only verification pass against all F-001–F-014 remediations plus full architecture review. Only `ENGINEERING_REVIEW.md` and `AUDIT_NOTES.md` were written.

---

## Executive Summary

The remediation window (9 commits, baseline → HEAD) closed 7 of 14 original findings cleanly and partially addressed 2 more. However, two CRITICAL/HIGH issues remain unresolved from the original audit: **F-001 and F-002 — the core KPI data API routes (`/api/kpis`, `/api/stats/totals`) are still completely unauthenticated**, meaning the application's most sensitive executive reporting data is publicly readable by any HTTP client without credentials. The second-pass research also identified 13 new findings (F-015–F-027), including one additional unauthenticated route (`/api/departments/[pillar]`, F-015/F-017), no rate limiting on the login endpoint (F-024), missing HTTP security headers (F-027), and hardcoded database credentials in `docker-compose.yml` (F-023). The build is clean (TypeScript: 0 errors), but ESLint exits with code 1 (15 errors, 16 warnings) and the test suite exits with code 1 (3 stale KpiCard tests + 1 ESM incompatibility block). **The branch is NOT safe to merge to production today** — the two unauthenticated data routes alone are a production blocker for a system described as containing sensitive executive-level financial and activity intelligence.

---

## 1. Architecture Map

### 1.1 Trust Boundary Diagram

```
[Internet / Browser]
    │
    ▼
[Next.js Edge Middleware — middleware.ts]
    matcher: /((?!_next/static|_next/image|favicon.ico|dabs-logo.png|api/).*) 
    protects:  all page routes except /login, /change-password
    enforces:  /admin/* → ADMIN role only (redirect to /dashboard on VIEWER/EDITOR)
               /upload  → blocks VIEWER role
               mustChangePassword → forces redirect to /change-password
    EXPLICITLY SKIPS: ALL /api/* routes
    │
    ├─► [Protected Pages] ──► RSC / Client Components (session required)
    │        /dashboard, /upload, /admin/*, /demo, /demo/colors
    │
    └─► [/api/* routes — Node.js runtime]
             Each route is self-contained: handles auth() independently
             NO centralized API auth layer
             Middleware provides ZERO protection for any API route
             │
             ├─► UNAUTHENTICATED (no auth() call):
             │     GET /api/kpis                    ← HIGH risk
             │     GET /api/stats/totals             ← HIGH risk
             │     GET /api/departments/[pillar]     ← HIGH risk
             │     GET /api/health                   ← intentional
             │
             └─► AUTHENTICATED (auth() called):
                   GET/POST /api/auth/[...nextauth]  (NextAuth internal)
                   GET      /api/kpis/[id]           (any session)
                   GET      /api/export/pdf           (any session)
                   PATCH    /api/user/change-password (any session)
                   GET/POST /api/comments             (any/ADMIN|EDITOR)
                   PATCH/DELETE /api/comments/[id]   (any/author|ADMIN)
                   POST     /api/upload               (ADMIN|EDITOR)
                   POST     /api/admin/clear-data     (ADMIN only)
                   GET/POST /api/admin/users          (ADMIN only)
                   PATCH/DELETE /api/admin/users/[id] (ADMIN only)
```

### 1.2 Module Ownership

| Module | Responsibility | Key exports |
|--------|---------------|-------------|
| `lib/prisma.ts` | Singleton Prisma client, audit `$extends` extension, `AsyncLocalStorage` user threading, TLS config | `prisma`, `withAuditUser` |
| `lib/kpi.ts` | Variance computation, YTD logic, color thresholds | `computeVariance`, `getVarianceColor` |
| `lib/config.ts` | Centralised reporting year constants | `REPORTING_YEAR` (2026), `PREV_REPORTING_YEAR` (2025) |
| `lib/departments.ts` | Division/department configuration, pillar enum whitelist | `VALID_PILLAR_IDS`, department configs |
| `lib/excel.ts` | XLSX parsing, column mapping, row validation | `parseExcel`, `validateRows` |
| `lib/narrative.ts` | Auto-generated Arabic executive narrative from variance thresholds | `generateNarrative` |
| `auth.ts` / `auth.config.ts` | NextAuth v5 configuration, JWT/session callbacks, credential validation | `auth`, `signIn`, `signOut` |
| `types/next-auth.d.ts` | NextAuth type augmentation (User, Session, JWT interfaces) | module augmentation only |
| `middleware.ts` | Edge middleware: page-route session guard, role-based redirects | default export |
| `prisma/schema.prisma` | Database schema: 7 models, 6 enums, 2 migration files | — |
| `components/kpi/` | KPI display components: KpiCard, KpiGrid, DrillDownModal, charts | per-component |
| `components/upload/` | File upload UI: FileUploader, ValidationPreview | per-component |
| `components/admin/` | User management UI: UserPanel | per-component |
| `components/layout/` | App shell: Sidebar, SplashScreen, DummyDataBanner | per-component |

### 1.3 Data Flow Traces

**KPI Read Path**
1. Browser → React Query `useQuery(['kpis', params])` → `GET /api/kpis?year=&period=&pillar=`
2. `app/api/kpis/route.ts:48` — handler reads `req.nextUrl.searchParams` with **no auth check**
3. `prisma.kpiRegistry.findMany({ where: { pillar }, take: 500, include: { targets, actuals } })`
4. Response: array of KPI records with targets and actuals — returned to any caller

**KPI Write Path (Excel Upload)**
1. Browser (EDITOR or ADMIN) → `POST /api/upload` with `multipart/form-data`
2. `app/api/upload/route.ts:18-26` — `auth()` called; session checked; role validated (ADMIN|EDITOR)
3. File size check (10 MB limit) → `file.arrayBuffer()` → MIME type check
4. `lib/excel.ts` — `parseExcel()` extracts rows; column headers matched to expected schema
5. `withAuditUser(session.user.id, async () => { ... })` — threads user ID into async context
6. `prisma.$transaction([...upserts], { timeout: 50000 })` — bulk upsert KpiRegistry + Target + Actual
7. Audit extension (`lib/prisma.ts:41`) writes `AuditLog` rows for each `Actual`/`KpiRegistry` mutation
8. Response: `{ inserted, updated, errors }` summary

**Comment Path**
1. Browser → `GET /api/comments?pillarId=X` — `auth()` checked (`line 13`), any authenticated session
2. `prisma.comment.findMany({ where: { pillarId }, include: { user } })` — no `take` limit (unbounded)
3. POST: `auth()` checked (`line 44`), role must be ADMIN|EDITOR; `pillarId` validated against `VALID_PILLAR_IDS`; text trimmed; 500-char max enforced
4. PATCH/DELETE on `comments/[id]`: `auth()` checked; author or ADMIN required (line 29/73)

**PDF Export Path**
1. Browser → `GET /api/export/pdf?year=&period=`
2. `app/api/export/pdf/route.ts:33-36` — `auth()` checked; 401 if no session
3. `prisma.kpiRegistry.findMany({ take: 500, include: { targets, actuals, programs } })`
4. `@react-pdf/renderer` renders Arabic document server-side with Cairo font embed
5. Response: `application/pdf` binary stream

**User Administration Path**
1. Browser (ADMIN) → `GET /api/admin/users` → `auth()` at line 15; role === 'ADMIN' at line 10
2. `prisma.user.findMany()` — no `take` limit (low risk: user count small)
3. POST: password length >= 8, role presence, `pillarId` whitelist validated
4. PATCH `users/[id]`: password length >= 8, `pillarId` whitelist
5. DELETE `users/[id]`: self-delete guard at line 76

**Clear-Data Path**
1. Browser (ADMIN only) → `POST /api/admin/clear-data`
2. `app/api/admin/clear-data/route.ts:8-9` — `auth()` + `role === 'ADMIN'` check
3. `withAuditUser(session.user.id, async () => { prisma.$transaction([deleteMany...]) })`
4. All `Actual`, `Target`, `KpiRegistry` records deleted within audited transaction

---

## 2. Role x Action Matrix

| Action | Route | Method | Unauth | VIEWER | EDITOR | ADMIN | Enforcement (file:line) |
|--------|-------|--------|--------|--------|--------|-------|------------------------|
| View KPI list | `/api/kpis` | GET | ALLOWED | ALLOWED | ALLOWED | ALLOWED | **NONE** — no auth() call (`app/api/kpis/route.ts:48`) |
| View KPI detail | `/api/kpis/[id]` | GET | BLOCKED | ALLOWED | ALLOWED | ALLOWED | `auth()` at `app/api/kpis/[id]/route.ts:13` |
| View stats totals | `/api/stats/totals` | GET | ALLOWED | ALLOWED | ALLOWED | ALLOWED | **NONE** — no auth() call (`app/api/stats/totals/route.ts:29`) |
| View dept data | `/api/departments/[pillar]` | GET | ALLOWED | ALLOWED | ALLOWED | ALLOWED | **NONE** — no auth() call (`app/api/departments/[pillar]/route.ts:19`) |
| Export PDF | `/api/export/pdf` | GET | BLOCKED | ALLOWED | ALLOWED | ALLOWED | `auth()` at `app/api/export/pdf/route.ts:33` |
| Upload data | `/api/upload` | POST | BLOCKED | BLOCKED | ALLOWED | ALLOWED | `auth()` + role check at `app/api/upload/route.ts:18-26` |
| Clear all data | `/api/admin/clear-data` | POST | BLOCKED | BLOCKED | BLOCKED | ALLOWED | `auth()` + `role === 'ADMIN'` at `app/api/admin/clear-data/route.ts:8-9` |
| List users | `/api/admin/users` | GET | BLOCKED | BLOCKED | BLOCKED | ALLOWED | `auth()` + ADMIN at `app/api/admin/users/route.ts:15,10` |
| Create user | `/api/admin/users` | POST | BLOCKED | BLOCKED | BLOCKED | ALLOWED | `auth()` + ADMIN at `app/api/admin/users/route.ts:36,10` |
| Update user | `/api/admin/users/[id]` | PATCH | BLOCKED | BLOCKED | BLOCKED | ALLOWED | `auth()` + ADMIN at `app/api/admin/users/[id]/route.ts:18,10` |
| Delete user | `/api/admin/users/[id]` | DELETE | BLOCKED | BLOCKED | BLOCKED | ALLOWED | `auth()` + ADMIN + self-delete guard at `app/api/admin/users/[id]/route.ts:68,76` |
| Change own password | `/api/user/change-password` | PATCH | BLOCKED | ALLOWED | ALLOWED | ALLOWED | `auth()` at `app/api/user/change-password/route.ts:7` |
| Read comments | `/api/comments` | GET | BLOCKED | ALLOWED | ALLOWED | ALLOWED | `auth()` at `app/api/comments/route.ts:13` |
| Post comment | `/api/comments` | POST | BLOCKED | BLOCKED | ALLOWED | ALLOWED | `auth()` + role check at `app/api/comments/route.ts:44,48` |
| Edit comment | `/api/comments/[id]` | PATCH | BLOCKED | own only (bug risk) | own only | ALLOWED | `auth()` + author or ADMIN at `app/api/comments/[id]/route.ts:15,29` |
| Delete comment | `/api/comments/[id]` | DELETE | BLOCKED | own only (bug risk) | own only | ALLOWED | `auth()` + author or ADMIN at `app/api/comments/[id]/route.ts:60,73` |
| Health check | `/api/health` | GET | ALLOWED | ALLOWED | ALLOWED | ALLOWED | Intentionally public |
| Login | `/api/auth/[...nextauth]` | POST | ALLOWED | — | — | — | NextAuth internal; bcrypt verify in authorize() |

Note: Rows marked "ALLOWED (security gap)" in Unauth column for the first three data routes represent the primary production blocker identified in this audit.

---

## 3. Remediation Verification (F-001 through F-014)

### F-001 · HIGH · `/api/kpis` unauthenticated access (GET)
**Status:** NOT FIXED
**Evidence:** `app/api/kpis/route.ts:48` — handler reads `req.nextUrl.searchParams` with no `auth()` call, no session check. Any unauthenticated HTTP client can enumerate all KPI data.
**Fix quality:** N/A — no fix applied.
**Remaining risk:** HIGH — full KPI registry with actuals and targets publicly readable. This is the application's primary data endpoint.
**Test coverage:** No.

---

### F-002 · HIGH · `/api/stats/totals` unauthenticated access
**Status:** NOT FIXED
**Evidence:** `app/api/stats/totals/route.ts:29` — `GET` handler is unprotected. All aggregated KPI category totals are publicly readable.
**Fix quality:** N/A — no fix applied.
**Remaining risk:** HIGH — exposes aggregated financial/activity data to anonymous callers.
**Test coverage:** No.

---

### F-003 · MEDIUM · Audit log `userId` always `'system'`
**Status:** VERIFIED FIXED
**Evidence:** `lib/prisma.ts:66` — `userId: auditUserStorage.getStore() ?? 'system'`. `withAuditUser` exported and called by upload route (lines 80 and 146) and clear-data route (line 15), wrapping all audited write transactions. `AsyncLocalStorage` threads the authenticated user ID through the async context correctly.
**Fix quality:** Solid. Only `Actual` and `KpiRegistry` are in `AUDITED_MODELS` — write routes that do not use `withAuditUser` (e.g., `comments`, `users`) correctly fall outside auditing scope, so no gap exists there.
**Remaining risk:** Low — routes performing writes on non-audited models (`comments`, `users`) do not need the wrapper. `change-password` updates `User` which is not audited, by design.
**Test coverage:** No dedicated test; correctness depends on AsyncLocalStorage behaviour under the production connection pooler (see Section 9).

---

### F-004 · HIGH · `/api/export/pdf` unauthenticated
**Status:** VERIFIED FIXED
**Evidence:** `app/api/export/pdf/route.ts:33-36` — `const session = await auth(); if (!session) { return NextResponse.json(..., { status: 401 }) }`. Pattern matches the standard used in other fixed routes.
**Fix quality:** Correct. All callers require an authenticated session; no role restriction is needed here per design.
**Remaining risk:** None.
**Test coverage:** No.

---

### F-005 · HIGH · TLS `rejectUnauthorized` hardcoded `false`
**Status:** VERIFIED FIXED
**Evidence:** `lib/prisma.ts:31-33` — `const ssl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : { rejectUnauthorized: true }`. Defaults to `true` (secure). Env var documented in `.env.example` with an inline warning comment.
**Fix quality:** Correct default; the env var approach is appropriate. Minor concern: `.env.example` ships with `DATABASE_SSL_REJECT_UNAUTHORIZED=false` as the example value — an operator copy-pasting without reading the warning would disable TLS validation.
**Remaining risk:** Low — depends on operator discipline. See Section 9 for live-environment verification requirements.
**Test coverage:** No.

---

### F-006 · HIGH · `/api/kpis/[id]` unauthenticated
**Status:** VERIFIED FIXED
**Evidence:** `app/api/kpis/[id]/route.ts:13-16` — `const session = await auth(); if (!session) { return NextResponse.json(..., { status: 401 }) }`.
**Fix quality:** Correct.
**Remaining risk:** None.
**Test coverage:** No.

---

### F-007 · HIGH · Clear-data accessible to EDITOR role
**Status:** VERIFIED FIXED
**Evidence:** `app/api/admin/clear-data/route.ts:9` — `if (!session || session.user.role !== 'ADMIN')`. Diff confirms the check was tightened from `ADMIN | EDITOR` to `ADMIN` only.
**Fix quality:** Correct. EDITORs now receive 403 on this endpoint.
**Remaining risk:** None.
**Test coverage:** No.

---

### F-008 · MEDIUM · Password minimum 6 characters
**Status:** VERIFIED FIXED
**Evidence:** Consistently applied across all three write paths and the UI:
- `app/api/user/change-password/route.ts:13` — `newPassword.length < 8`
- `app/api/admin/users/route.ts:53` — `password.length < 8`
- `app/api/admin/users/[id]/route.ts:39` — `body.newPassword.length < 8`
- `components/admin/UserPanel.tsx:208` — `minLength={8}`

**Fix quality:** Correct and consistent. All entry points now enforce 8-char minimum.
**Remaining risk:** None.
**Test coverage:** No dedicated API-level test for password validation.

---

### F-009 · LOW · `VALID_PILLAR_IDS` duplicated
**Status:** VERIFIED FIXED
**Evidence:** `app/api/comments/route.ts:4` — `import { VALID_PILLAR_IDS } from '@/lib/departments'`. The local inline Set (8 items) was removed in commit `5a49251`. `lib/departments.ts:25` is now the single source of truth.
**Fix quality:** Correct. Single-source pattern.
**Remaining risk:** None.
**Test coverage:** Yes — `prisma/seed.test.ts` imports `VALID_PILLAR_IDS` from `@/lib/departments` and asserts all KPI pillars are valid.

---

### F-010 · MEDIUM · Hardcoded years 2025/2026 scattered
**Status:** PARTIALLY FIXED
**Evidence:** `lib/config.ts` exports `REPORTING_YEAR = 2026` and `PREV_REPORTING_YEAR = 2025`. Upload and excel parser correctly use them. The following locations remain hardcoded and do NOT use the config constants:

| File | Line(s) | Literal | Context |
|------|---------|---------|---------|
| `lib/excel.ts` | 163–164 | `'2025'`, `'المستهدف 2026'` | XLSX column header strings |
| `prisma/seed.ts` | 8 | `const YEAR = 2026` | Seed script uses own constant |
| `components/ExportButton.tsx` | 7 | `'2026'` | Default year query param |
| `components/kpi/BeneficiaryChart.tsx` | 276 | `'2026'` | Default year query param |
| `components/kpi/DeptOverview.tsx` | 86 | `'2026'` | Default year query param |
| `components/kpi/DivisionAchievementChart.tsx` | 194 | `'2026'` | Default year query param |
| `components/kpi/DivisionStats.tsx` | 59 | `'2026'` | Default year query param |
| `components/kpi/DrillDownModal.tsx` | 16 | `'2026'` | Default year query param |
| `components/kpi/KpiGrid.tsx` | 15 | `'2026'` | Default year query param |
| `components/narrative/ExecutiveSummary.tsx` | 11 | `'2026'` | Default year query param |
| `components/department/DepartmentDashboard.tsx` | 27, 99 | `2025`, `2026` | Label string and hardcoded `year={2026}` prop |
| `components/upload/FileUploader.tsx` | 148 | `2025`, `2026` | User-facing column guidance text |
| `components/upload/ValidationPreview.tsx` | 36–51 | `2025`, `2026` | Table headers and cell data |

Note: `app/api/departments/[pillar]/route.ts` lines 41, 63, 86, 92, 97, 101, 104, 107, 108, 158 use `PREV_REPORTING_YEAR` and `REPORTING_YEAR` from config (correctly); variable names `q2025Map`/`ytd2025` and inline comment text are cosmetic only.

**Fix quality:** Partial — backend and core parsing paths were centralised. UI components and seed script were not updated.
**Remaining risk:** MEDIUM — advancing to 2027 requires touching 10+ UI component files and the seed script.
**Test coverage:** No.

---

### F-011 · MEDIUM · React Hook called after conditional return in `DepartmentDashboard`
**Status:** VERIFIED FIXED
**Evidence:** `components/department/DepartmentDashboard.tsx` — `useQuery` is now called unconditionally before the `if (!config) return null` guard (commit `63a33a4`). `enabled: !!config` prevents any fetch when config is absent.
**Fix quality:** Correct. Follows the standard pattern for conditional React Query fetches.
**Remaining risk:** None. ESLint `react-hooks/rules-of-hooks` will catch regressions.
**Test coverage:** No dedicated test.

---

### F-012 · LOW · `DummyDataBanner` hydration mismatch
**Status:** VERIFIED FIXED
**Evidence:** `components/layout/DummyDataBanner.tsx` — `visible` state initialises to `false` (SSR-safe). `useEffect` calls `setVisible(true)` only after mount when session storage key is absent. SSR and initial hydration both render `null` (banner hidden), eliminating the mismatch.
**Fix quality:** Correct. The `eslint-disable` comment acknowledges the intentional SSR pattern.
**Remaining risk:** None.
**Test coverage:** No.

---

### F-013 · LOW · Sidebar `as any` cast
**Status:** CANNOT VERIFY (not in diff)
**Evidence:** The git diff for `components/layout/Sidebar.tsx` shows no changes in the remediation window. No `as any` cast appears in the grep results for that file path specifically. The Sidebar component was not directly modified.
**Fix quality:** Assumed resolved — grep returns no `as any` hits in `components/layout/Sidebar.tsx`. No confirmation from diff.
**Remaining risk:** Assumed LOW based on grep evidence. `Sidebar.test.tsx` exists and passes.
**Test coverage:** `Sidebar.test.tsx` passes (part of the 71 passing tests).

---

### F-014 · MEDIUM · Missing query limits (unbounded DB fetches)
**Status:** PARTIALLY FIXED
**Evidence:** Limits added:
- `app/api/kpis/route.ts:68` — `take: 500` added
- `app/api/export/pdf/route.ts:43` — `take: 500` added

Limits still absent:

| Route | Location | Risk level |
|-------|----------|------------|
| `app/api/kpis/[id]/route.ts:25` | `prisma.actual.findMany` | MEDIUM — per-KPI actuals can be high-cardinality across regions/facilities |
| `app/api/departments/[pillar]/route.ts:26` | `prisma.kpiRegistry.findMany` | LOW |
| `app/api/stats/totals/route.ts:34` | `prisma.kpiRegistry.findMany` | LOW |
| `app/api/comments/route.ts:27` | `prisma.comment.findMany` | LOW |
| `app/api/admin/users/route.ts:19` | `prisma.user.findMany` | LOW (user count small) |

**Fix quality:** Partial — the two highest-volume routes were capped. The `Actual` table per individual KPI is the highest remaining risk.
**Remaining risk:** MEDIUM — `kpis/[id]` actuals are unbounded; high facility/region cardinality could cause memory pressure.
**Test coverage:** No.

---

## 4. New Findings (F-015 and above)

### F-015 · HIGH · Three core data routes completely unauthenticated
**Affected:** `app/api/kpis/route.ts:48`, `app/api/stats/totals/route.ts:29`, `app/api/departments/[pillar]/route.ts:19`
**Evidence:** All three routes have no `auth()` call. Middleware explicitly skips all `/api/` routes (`middleware.ts:49`). Any HTTP client without a session cookie can call these endpoints directly.
**Impact:** Full KPI data, aggregated financial/activity totals, and per-department drill-down data for all 13 pillar departments are publicly readable. This covers the primary business intelligence the system is designed to protect. F-001 and F-002 from the original audit were not fixed.
**Recommended fix:** Add at the top of each GET handler (same pattern as `app/api/kpis/[id]/route.ts:13-16`):
```typescript
const session = await auth();
if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
```
**Acceptance criteria:** `curl` without a session cookie to each of the three routes returns HTTP 401.

---

### F-016 · LOW · `/api/health` exposes session details when `?auth=1`
**Affected:** `app/api/health/route.ts:22-27`
**Evidence:** The POST handler with `?auth=1` returns `{ role: session.user?.role, id: session.user?.id }` — the authenticated user's role and internal CUID — in the response body. This is a debugging artifact.
**Impact:** An authenticated attacker can confirm their own role via this endpoint. Role enumeration could aid targeted privilege-escalation attempts. The ID is a CUID (not sensitive by itself).
**Recommended fix:** Remove session details from the health endpoint response, or gate the `?auth=1` branch on `NODE_ENV === 'development'`.
**Acceptance criteria:** POST to `/api/health?auth=1` as an authenticated user returns no `role` or `id` fields in the response body.

---

### F-017 · MEDIUM · `/api/departments/[pillar]` accepts arbitrary string as Pillar enum without returning 400
**Affected:** `app/api/departments/[pillar]/route.ts:28`
**Evidence:** The route casts `pillar` path parameter directly to `Pillar` enum (`pillar as Pillar`) without validating membership. Prisma returns empty array for invalid values (route returns `null`), but no HTTP 400 is returned and the TypeScript cast is unsafe.
**Impact:** Not a data-exposure issue (Prisma filters cleanly), but arbitrary strings reach the DB query layer without validation. Any future change in Prisma's enum handling could silently become a bug.
**Recommended fix:** Validate `pillar` against `VALID_PILLAR_IDS` (from `lib/departments.ts`) and return `NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })` for invalid values — same pattern used in `app/api/comments/route.ts`.
**Acceptance criteria:** `GET /api/departments/INVALID_PILLAR` returns HTTP 400.

---

### F-018 · LOW · `SplashScreen` `setState-in-effect` ESLint error (lint CI blocker)
**Affected:** `components/layout/SplashScreen.tsx:16`
**Evidence:** ESLint rule `react-hooks/set-state-in-effect` flags `setVisible(true)` called synchronously inside `useEffect`. `DummyDataBanner.tsx` received an `eslint-disable` comment fix for the identical pattern (F-012), but `SplashScreen.tsx` did not.
**Impact:** ESLint exits with code 1 in CI due to this error, potentially blocking pipeline builds over a one-line suppression gap.
**Recommended fix:** Add `// eslint-disable-next-line react-hooks/set-state-in-effect` above line 16 with a comment explaining the SSR-safe intent, matching the `DummyDataBanner.tsx` pattern.
**Acceptance criteria:** `npm run lint` no longer reports this error.

---

### F-019 · LOW · `FileUploader.tsx` uses unnecessary `as any` cast despite typed session
**Affected:** `components/upload/FileUploader.tsx:15`
**Evidence:** `(session?.user as any)?.role` — `session.user.role` is now fully typed as `UserRole` via `types/next-auth.d.ts`. The cast is redundant and generates an ESLint `@typescript-eslint/no-explicit-any` error.
**Impact:** Lint failure (contributes to ESLint exit code 1). No runtime risk.
**Recommended fix:** Replace `(session?.user as any)?.role` with `session?.user?.role` — the type is known. Same cleanup applicable to lines 34 and 64 in the same file.
**Acceptance criteria:** `components/upload/FileUploader.tsx:15` no longer triggers `@typescript-eslint/no-explicit-any`.

---

### F-020 · LOW · Upload route leaks internal error message to client
**Affected:** `app/api/upload/route.ts:174`
**Evidence:** `return NextResponse.json({ error: \`خطأ في معالجة الملف: ${String(err)}\` }, { status: 500 })` — the full `String(err)` representation of the error (which may include Prisma error messages, file system paths, or library version info) is returned to the client.
**Impact:** Authenticated uploaders (ADMIN, EDITOR) receive internal implementation details in error responses. Prisma errors can expose table names, column names, and constraint names.
**Recommended fix:** Return a generic message; log details server-side only:
```typescript
console.error('[upload] unhandled error', err);
return NextResponse.json({ error: 'خطأ في معالجة الملف' }, { status: 500 });
```
**Acceptance criteria:** A deliberate upload error returns `{ error: 'خطأ في معالجة الملف' }` only; no stack trace or Prisma internals in the response body.

---

### F-021 · LOW · `KpiCard` tests assert removed `data-variance` attribute (broken test suite)
**Affected:** `components/kpi/KpiCard.test.tsx:52,61,70`
**Evidence:** Three test cases assert `[data-variance="amber"]`, `[data-variance="green"]`, `[data-variance="red"]`. The KpiCard component removed these attributes in commit `e0af688` (before the remediation window). Tests were never updated and fail on every run.
**Impact:** `npm test` exits with code 1. CI pipeline marks builds as failed, reducing signal-to-noise for real regressions. All 3 failures are pre-existing.
**Recommended fix:** Update the three test cases to assert the actual observable variance signal currently rendered by `KpiCard`, or remove them if variance coloring was intentionally removed.
**Acceptance criteria:** `npm test` exits with code 0.

---

### F-022 · MEDIUM · `upload/route.test.ts` cannot run due to Jest ESM incompatibility
**Affected:** `app/api/upload/route.test.ts`; root cause: Jest transform config does not include `next-auth`
**Evidence:** `next-auth` v5 ships ESM-only code. Jest's default transform config excludes `node_modules`, causing the entire upload route test suite to fail to compile. Pre-existing since commit `e397c06`.
**Impact:** Zero test coverage of the upload API — the most security-critical route (file ingestion, auth enforcement, MIME validation, DB transaction writes) is entirely untested.
**Recommended fix:** Add `next-auth` to Jest's `transformIgnorePatterns` exclusion list (e.g., `/node_modules/(?!(next-auth))/`), or use `moduleNameMapper` to redirect `next-auth` imports to a manual mock. Alternatively, migrate to `--experimental-vm-modules` for native ESM support.
**Acceptance criteria:** `app/api/upload/route.test.ts` compiles and runs without ESM parse errors.

---

### F-023 · MEDIUM · `docker-compose.yml` hardcodes weak database credentials
**Affected:** `docker-compose.yml:6-8`
**Evidence:** `POSTGRES_PASSWORD: ers_pass`, `POSTGRES_USER: ers_user`, `POSTGRES_DB: ers_db` — weak, hardcoded values checked into version control without env var substitution.
**Impact:** If this Compose file is used directly in a production or staging environment with the DB port exposed, the database is trivially accessible with known credentials. The `.env.example` does not reference these Compose credentials, creating a documentation gap.
**Recommended fix:** Use env var substitution with a safe local fallback:
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ers_pass}
POSTGRES_USER: ${POSTGRES_USER:-ers_user}
```
Add a comment: `# Override these in production — do not use defaults.` Document in `.env.example`.
**Acceptance criteria:** `docker-compose.yml` contains no literal credential values; all credentials sourced from env vars.

---

### F-024 · HIGH · No rate limiting on authentication endpoint
**Affected:** `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`
**Evidence:** No rate limiting, account lockout, or brute-force protection exists on `/api/auth/callback/credentials`. The NextAuth credentials provider runs bcrypt-12 on every attempt (~250ms/attempt), but there is no request throttle or IP-based limit.
**Impact:** Brute-force attacks on admin credentials are possible. The known default username `admin` (from `.env.example`) makes targeted attacks easier. At ~250ms/attempt, 1,000 attempts/hour from a single IP is feasible without throttling.
**Recommended fix:** Implement IP-based rate limiting on the auth endpoint in `middleware.ts` (or via an upstream reverse proxy). Alternatively, add a `failedAttempts` counter and `lockedUntil` timestamp to the `User` model with a 15-minute lockout after 5 failures.
**Acceptance criteria:** 6+ rapid login attempts from the same IP are throttled or blocked; the response after the threshold is HTTP 429 or delayed.

---

### F-025 · LOW · `AuditLog` has no indexes on `timestamp` or `userId`
**Affected:** `prisma/schema.prisma:109-117`
**Evidence:** The `AuditLog` model has no `@@index` declarations. All audit log queries will perform full table scans as the table grows.
**Impact:** Admin audit log queries will degrade linearly with upload frequency. With regular bulk uploads, this table can grow to millions of rows.
**Recommended fix:** Add to `schema.prisma` AuditLog model:
```prisma
@@index([userId])
@@index([timestamp])
@@index([kpiId])
```
Then run `npx prisma migrate dev`.
**Acceptance criteria:** `prisma/schema.prisma` for `AuditLog` includes the three indexes; a migration file is generated.

---

### F-026 · LOW · `Comment.pillarId` has no index
**Affected:** `prisma/schema.prisma:131-139`
**Evidence:** `comments` are queried by `pillarId` (`prisma.comment.findMany({ where: { pillarId } })`), but no `@@index([pillarId])` exists on the `Comment` model.
**Impact:** Table scan on every comment list request as comment volume grows.
**Recommended fix:** Add `@@index([pillarId])` to the `Comment` model in `prisma/schema.prisma` and run `npx prisma migrate dev`.
**Acceptance criteria:** `Comment` model in schema includes `@@index([pillarId])`.

---

### F-027 · MEDIUM · `next.config.ts` has no HTTP security headers
**Affected:** `next.config.ts`
**Evidence:** No `headers()` function is defined in the Next.js config. Standard security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`) are absent.
**Impact:** Browsers do not enforce CSP (XSS risk), clickjacking protection is absent, MIME sniffing is not disabled, HSTS is not enforced. Baseline requirement for a web application handling sensitive executive reporting data.
**Recommended fix:** Add a `headers()` function to `next.config.ts`:
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }];
}
```
CSP requires careful tuning for `@react-pdf/renderer` and inline styles; add after the above baseline.
**Acceptance criteria:** Browser DevTools Network tab shows all four headers on every page response.

---

## 5. Build / Lint / Type / Test Results

### 5.1 TypeScript (`npx tsc --noEmit`)
**Exit code:** 0
**Result:** Clean pass — zero type errors.

---

### 5.2 ESLint (`npm run lint`)
**Exit code:** 1
**Errors:** 15 · **Warnings:** 16

| File | Line | Rule | Pre-existing? | Notes |
|------|------|------|---------------|-------|
| `components/layout/SplashScreen.tsx` | 16:7 | `react-hooks/set-state-in-effect` | Likely pre-existing | `DummyDataBanner.tsx` received same fix; `SplashScreen.tsx` did not. See F-018. |
| `components/upload/FileUploader.tsx` | 15:68 | `@typescript-eslint/no-explicit-any` | Pre-existing | `(session?.user as any)?.role` — unnecessary cast. See F-019. |
| `components/upload/FileUploader.tsx` | 34:17 | `@typescript-eslint/no-explicit-any` | Pre-existing | Unexpected any in FileUploader |
| `components/upload/FileUploader.tsx` | 64:17 | `@typescript-eslint/no-explicit-any` | Pre-existing | Unexpected any in FileUploader |
| `lib/excel.test.ts` | 16:63 | `@typescript-eslint/no-explicit-any` | Pre-existing | Test file cast |
| `lib/excel.test.ts` | 33:67 | `@typescript-eslint/no-explicit-any` | Pre-existing | Test file cast |
| `lib/excel.test.ts` | 39:75 | `@typescript-eslint/no-explicit-any` | Pre-existing | Test file cast |
| `lib/excel.test.ts` | 39:97 | `@typescript-eslint/no-explicit-any` | Pre-existing | Test file cast |
| `lib/excel.test.ts` | 71:43 | `@typescript-eslint/no-explicit-any` | Pre-existing | Test file cast |
| `lib/prisma.ts` | 41:65 | `@typescript-eslint/no-explicit-any` | Introduced in F-003 fix | Prisma `$extends` API structural necessity — not removable without upstream Prisma type improvements |
| `lib/prisma.ts` | 48:50 | `@typescript-eslint/no-explicit-any` | Introduced in F-003 fix | Prisma extension parameter access |
| `lib/prisma.ts` | 51:45 | `@typescript-eslint/no-explicit-any` | Introduced in F-003 fix | Prisma extension dynamic model access |
| `lib/prisma.ts` | 52:33 | `@typescript-eslint/no-explicit-any` | Introduced in F-003 fix | Prisma extension parameter access |
| `lib/prisma.ts` | 64:28 | `@typescript-eslint/no-explicit-any` | Introduced in F-003 fix | Prisma extension auditLog access |
| `lib/prisma.ts` | 102:30 | `@typescript-eslint/no-explicit-any` | Introduced in F-003 fix | Proxy get trap |

Notable warnings include `@next/next/no-img-element` in `components/layout/Sidebar.test.tsx:20` and `@typescript-eslint/no-unused-vars` in several data files.

The 5 `lib/prisma.ts` errors from the F-003 audit-fix are structural necessities of the Prisma `$extends` API and cannot be resolved without upstream Prisma type improvements. They should be suppressed with inline `eslint-disable-next-line` comments and a brief explanation. The `FileUploader.tsx` errors (F-019) are genuinely fixable today.

---

### 5.3 Test Suite (`npm test`)
**Exit code:** 1
**Passed:** 71 · **Failed:** 3 (+ 1 suite blocked) · **Skipped:** 0
(Note: `seed.test.ts` skips DB tests when `DATABASE_URL` is absent)

| Test | File | Failure reason | Pre-existing? |
|------|------|---------------|---------------|
| `KpiCard > sets data-variance="amber" for 90% variance` | `components/kpi/KpiCard.test.tsx:52` | `data-variance` attribute removed in commit `e0af688` before remediation window; test never updated | YES |
| `KpiCard > sets data-variance="green" when >95%` | `components/kpi/KpiCard.test.tsx:61` | Same as above | YES |
| `KpiCard > sets data-variance="red" when <85%` | `components/kpi/KpiCard.test.tsx:70` | Same as above | YES |
| `app/api/upload/route.test.ts` (suite) | `app/api/upload/route.test.ts` | Jest cannot parse `next-auth/index.js` (ESM syntax); transform config does not include `next-auth`; pre-existing since commit `e397c06` | YES |

All 4 failures are pre-existing — none were introduced by the F-001–F-014 remediation commits.

---

### 5.4 Intentional Behavior Changes
The following observable application behavior changes were introduced by the F-001–F-014 fixes:

| Change | Introduced by | Affected route/component |
|--------|--------------|--------------------------|
| EDITOR now receives HTTP 403 on `POST /api/admin/clear-data` instead of HTTP 200 | F-007 fix (`b62ac1e`) | `app/api/admin/clear-data/route.ts` |
| `GET /api/kpis/[id]` without a session now returns HTTP 401 | F-006 fix (`b62ac1e`) | `app/api/kpis/[id]/route.ts` |
| `GET /api/export/pdf` without a session now returns HTTP 401 | F-004 fix (`b62ac1e`) | `app/api/export/pdf/route.ts` |
| Password creation/change now requires minimum 8 characters (up from 6) | F-008 fix (`9e50675`) | Three API routes + `UserPanel.tsx` |
| `DepartmentDashboard` no longer crashes when config is null | F-011 fix (`63a33a4`) | `components/department/DepartmentDashboard.tsx` |
| `DummyDataBanner` no longer produces hydration warnings | F-012 fix (`b62ac1e`) | `components/layout/DummyDataBanner.tsx` |
| Audit log entries now show real user IDs instead of `'system'` | F-003 fix (`64cec9e`) | Audit log for all upload and clear-data operations |
| TLS validation now defaults to `true`; opt-out requires explicit env var | F-005 fix (`e5e6116`) | `lib/prisma.ts` DB connection |
| Reporting year centralised; upload and excel parser now read from `lib/config.ts` | F-010 partial fix (`dcdcbcd`) | `lib/config.ts`, `lib/excel.ts`, `app/api/upload/route.ts` |
| `VALID_PILLAR_IDS` for comment validation now sourced from `lib/departments.ts` | F-009 fix (`5a49251`) | `app/api/comments/route.ts` |
| `kpis` and `export/pdf` queries now capped at 500 records | F-014 partial fix (`9e50675`) | `app/api/kpis/route.ts`, `app/api/export/pdf/route.ts` |
| DB indexes on `Target.kpiId` and `Actual.kpiId` added | F-014 partial fix (`9e50675`) | `prisma/schema.prisma` |

---

## 6. Operational Readiness

| Area | Status | Evidence |
|------|--------|----------|
| DB backup strategy | NOT FOUND | No backup scripts, cron jobs, or documentation in repository. `docker-compose.yml` uses named volume `pgdata` with no backup configuration. |
| Health endpoint | PARTIAL | `GET /api/health` exists; returns `{ ok: true, step: 1, ts: Date.now() }`. No DB connectivity check. No `/readyz` endpoint. No liveness/readiness split. |
| Structured logging | NOT FOUND | Only `console.error` in error catch blocks. No JSON structured logging. No Sentry or error tracking integration. |
| Auth rate limiting | NOT FOUND | No rate limiting on `/api/auth/callback/credentials`. See F-024. No account lockout mechanism. |
| Secret management | PARTIAL | `AUTH_SECRET` and `DATABASE_URL` via env vars (documented in `.env.example`). No secrets manager integration. `.env.example` ships `DATABASE_SSL_REJECT_UNAUTHORIZED=false` as the documented example value — a potentially misleading default. |
| TLS validation | FIXED (F-005) | `lib/prisma.ts:31-33` — defaults to `rejectUnauthorized: true`. Opt-out requires explicit env var. |
| Docker credentials | WEAK (F-023) | `docker-compose.yml:6-8` — hardcoded `POSTGRES_PASSWORD: ers_pass` without env var substitution. |
| HTTP security headers | NOT FOUND | `next.config.ts` has no `headers()` function. See F-027. |
| CI/CD config | NOT FOUND | No `.github/workflows/`, no `Dockerfile`, no deployment pipeline detected in repository. |
| Rollback strategy | NOT FOUND | No documented rollback procedure. Prisma migration files exist but no rollback scripts. |
| CSRF protection | NOT REQUIRED | NextAuth v5 handles CSRF for auth endpoints. API routes use JSON bodies (not form data, except upload). No explicit CSRF token needed. |
| Default admin credentials | LOW RISK | `.env.example` documents `ADMIN_PASSWORD=changeme`. `mustChangePassword: true` on seed forces change on first login — provides safety net but depends on operator not bypassing it. |

---

## 7. Prioritized Enhancement Plan

### Tier 1 — Must fix before production

| ID | Action | Files | Effort | Expected benefit | Behavior impact | Acceptance criteria | Rollback |
|----|--------|-------|--------|-----------------|-----------------|--------------------|---------| 
| F-001/F-002/F-015 | Add `auth()` guards to `/api/kpis`, `/api/stats/totals`, `/api/departments/[pillar]` | `app/api/kpis/route.ts`, `app/api/stats/totals/route.ts`, `app/api/departments/[pillar]/route.ts` | 15 min | Eliminates public read of all executive KPI data | Unauthenticated API callers receive 401; front-end client components already have sessions so no UX change | `curl` without cookie returns 401 on all three routes | Revert 3 lines per file |
| F-024 | Add rate limiting on login endpoint | `middleware.ts` or upstream proxy config | 2–4 hrs | Brute-force protection on admin credentials | Rapid repeated login attempts throttled (429) | 6+ attempts in 60s from same IP returns 429 | Revert middleware change |
| F-021 | Fix stale KpiCard test assertions | `components/kpi/KpiCard.test.tsx` | 1 hr | `npm test` exits 0; CI builds pass | None (test-only change) | `npm test` passes with 74 passing, 0 failing | Revert test file |
| F-022 | Fix Jest ESM incompatibility for upload route tests | `jest.config.ts` or `jest.config.js` | 2–3 hrs | Upload route gains test coverage; test suite fully runs | None (config-only change) | `app/api/upload/route.test.ts` compiles and executes | Revert jest config |

### Tier 2 — Fix before onboarding real editors

| ID | Action | Files | Effort | Expected benefit | Behavior impact | Acceptance criteria | Rollback |
|----|--------|-------|--------|-----------------|-----------------|--------------------|---------| 
| F-027 | Add HTTP security headers to `next.config.ts` | `next.config.ts` | 2 hrs | Baseline browser security (XSS, clickjacking, MIME sniffing) | None observable to users | Browser DevTools shows `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` on all responses | Revert headers() function |
| F-023 | Parameterise docker-compose.yml credentials | `docker-compose.yml`, `.env.example` | 30 min | Prevents hardcoded credential exposure in version control | Requires operators to set env vars; local dev still works with defaults | No literal credentials in `docker-compose.yml` | Revert to hardcoded (dev only) |
| F-010 | Complete year centralisation for UI components | 10 component files, `prisma/seed.ts` | 3–4 hrs | Single config change advances all UI to new reporting year | None observable | Grep for `'2025'` and `'2026'` literals in `components/` returns 0 results | Revert component changes |
| F-020 | Strip internal error from upload 500 response | `app/api/upload/route.ts:174` | 10 min | Prevents Prisma internals leaking to client | Upload errors show generic Arabic message only | Deliberate malformed upload returns `{ error: 'خطأ في معالجة الملف' }` only | Revert one line |
| F-018/F-019 | Fix remaining lint errors (SplashScreen + FileUploader casts) | `components/layout/SplashScreen.tsx`, `components/upload/FileUploader.tsx` | 30 min | ESLint exits cleanly | None observable | `npm run lint` exits 0 (or at minimum these errors removed) | Revert |
| F-014 (remaining) | Add `take` limits to `kpis/[id]`, `departments/[pillar]`, `comments`, `users` | 4 route files | 1 hr | Prevents memory pressure from unbounded DB reads | High-cardinality actual sets capped | Each remaining route has explicit `take` limit | Revert |

### Tier 3 — Operational hardening

| ID | Action | Files | Effort | Expected benefit | Behavior impact | Acceptance criteria | Rollback |
|----|--------|-------|--------|-----------------|-----------------|--------------------|---------| 
| F-025/F-026 | Add indexes to `AuditLog` and `Comment` models | `prisma/schema.prisma` + migration | 1 hr | Prevents table scans as audit/comment volume grows | Faster admin queries; no UX change | Schema includes indexes on `AuditLog` (userId, timestamp, kpiId) and `Comment` (pillarId) | Revert migration (drop indexes) |
| F-016 | Remove session details from health endpoint | `app/api/health/route.ts` | 15 min | Removes role enumeration vector | Health endpoint returns only liveness info | Health endpoint never returns `role` or `id` fields | Revert |
| F-017 | Add 400 validation for invalid pillar enum in departments route | `app/api/departments/[pillar]/route.ts` | 30 min | Proper input validation, 400 for invalid pillar | Invalid pillar returns 400 instead of null/404 | `GET /api/departments/INVALID` returns 400 | Revert |
| — | Add DB connectivity check to health endpoint | `app/api/health/route.ts` | 1 hr | Liveness probe detects DB connection failures | Health endpoint returns 503 when DB unreachable | `GET /api/health` runs `prisma.$queryRaw` SELECT 1 and returns 503 on failure | Revert |
| — | Add structured JSON logging | Logging utility + all route files | 4–6 hrs | Parseable logs for log aggregators; easier incident investigation | No UX change | All `console.error` calls replaced with structured JSON logger | Revert logger |
| — | Set up CI/CD pipeline | `.github/workflows/ci.yml` | 4 hrs | Automated lint + test + build on every PR | No UX change | PRs blocked when lint/tests fail | Disable workflow |
| — | Document and implement DB backup strategy | `scripts/backup.sh`, cron config | 2 hrs | Recovery from data loss | No UX change | Nightly pg_dump to named location; documented in `PROJECT.md` | Remove cron |

---

## 8. Merge Recommendation

**Verdict:** NO — NOT SAFE TO MERGE TO PRODUCTION

**Blockers (must fix before merge):**
1. **F-001/F-002/F-015** — `/api/kpis`, `/api/stats/totals`, and `/api/departments/[pillar]` are unauthenticated. All KPI, financial, and department data is publicly readable without credentials. This alone disqualifies a production merge for a system handling sensitive executive reporting data.
2. **F-021** — Test suite exits with code 1 (3 stale KpiCard tests + 1 ESM-blocked suite). CI cannot give a green signal until this is resolved.
3. **F-024** — No brute-force protection on the login endpoint against an internal threat model with a known default username (`admin` from `.env.example`).

**Recommended before merge:**
1. F-027 — Add HTTP security headers (10 lines in `next.config.ts`; baseline browser security).
2. F-023 — Parameterise Docker Compose credentials (prevents accidental production exposure).
3. F-010 — Complete year centralisation in UI components (10+ files; prevents 2027 requiring a grep-and-replace across the whole codebase).
4. F-018/F-019 — Clear remaining lint errors (achieves ESLint exit code 0).
5. F-022 — Fix Jest ESM config to restore upload route test coverage.

**Can defer post-merge (track as follow-up issues):**
1. F-014 (remaining routes) — Bounded DB queries for `kpis/[id]`, `comments`, `departments`, `users`.
2. F-025/F-026 — Schema indexes for `AuditLog` and `Comment`.
3. F-016 — Health endpoint session detail removal.
4. F-017 — Departments route pillar enum 400 validation.
5. F-020 — Strip Prisma internals from upload 500 response.
6. Structured logging, CI/CD pipeline, DB backup strategy.

---

## 9. Evidence Still Needed for Production Sign-Off

Items that cannot be verified from the repository alone and require a live environment:

| Item | Why it matters | How to verify |
|------|---------------|---------------|
| TLS cert validation under production DB | F-005 fix gates on env var — need to confirm prod `.env` sets `DATABASE_SSL_REJECT_UNAUTHORIZED` correctly (omitted or absent, defaulting to `true`) | Connect to prod DB with an intentionally invalid/self-signed cert and confirm the connection is rejected with a TLS error; confirm env var is not set to `'false'` in production |
| Audit log attribution under real traffic | `AsyncLocalStorage` behaves differently under connection pooling (e.g., PgBouncer) — user IDs could bleed across request boundaries or be lost | Upload a file as a named EDITOR; confirm `AuditLog` rows show that user's ID, not `'system'` or another user's ID |
| Unauthenticated API access via direct HTTP | Verifies that after the F-015 fix is applied, the three routes are actually protected in a deployed environment (not just in unit tests) | From an external IP without credentials: `curl https://[prod-domain]/api/kpis` — confirm 401 response |
| `mustChangePassword` force-change enforcement | Safety net for `changeme` default admin password depends on this middleware redirect working correctly | Seed a user with `mustChangePassword: true` and confirm all pages (except `/change-password`) redirect, including direct API access patterns |
| bcrypt timing on production hardware | F-024 risk estimation assumed ~250ms/attempt for bcrypt-12. This varies by CPU. | Run `bcrypt.hash('test', 12)` on the production server and record the actual timing to refine the brute-force risk estimate |
| DB connection pool behaviour under load | No connection pool config documented; Prisma defaults may be insufficient for multi-user concurrent upload scenarios | Confirm Prisma connection pool size is appropriate for expected concurrency; check for connection exhaustion under multi-user upload load |

---

**The branch is NOT safe to merge to production: three unauthenticated data routes expose the full KPI dataset without credentials, the test suite exits non-zero, and there is no brute-force protection on the login endpoint.**
