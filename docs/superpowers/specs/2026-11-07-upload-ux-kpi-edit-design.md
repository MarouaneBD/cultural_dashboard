# Upload UX Improvements + KPI Metadata Edit — Design Spec

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Give users clear, categorized feedback after an Excel upload, eliminate raw browser error messages, and let admins fix KPI name/type typos without a re-upload.

**Architecture:** Server splits upload results into distinct outcome buckets (direct updates, staged rows, scope rejections, DB failures). UI renders each bucket as a separate line. A new `PATCH /api/admin/kpis/[id]` route handles rare KPI metadata corrections; a pencil icon on KPI cards surfaces it to admins.

**Tech Stack:** Next.js App Router, Prisma, React Query, Tailwind, existing `withAuditUser` audit hook.

## Global Constraints

- Arabic-first: all user-visible strings are Arabic
- RBAC enforced server-side on every mutation; never rely on UI gating alone
- Pillar (`KpiRegistry.pillar`) is immutable — do not expose it as editable
- Audit log entry required for every write to `KpiRegistry`
- Use existing `withAuditUser` for all Prisma mutations that change data
- `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` on every new API route
- No new dependencies — use existing Prisma, React Query, Tailwind patterns
- Do not change the `ValidationPreview` component's props interface — only add optional new props
- `staged` replaces `queued` in the upload response; both names must work during the transition (add `queued` as an alias in the response) — wait, actually we can just rename it since FileUploader is the only consumer. Remove `queued`, add `staged`.

---

## Sub-project A: Upload result categorization

### A1 — Server: split errors into buckets

**File to modify:** `app/api/upload/route.ts`

Change the commit-path response from:
```ts
{ created, updated, queued, submissionId, errors[] }
```
to:
```ts
{ created, updated, staged, submissionId, scopeErrors[], dbErrors[] }
```

- `staged` = count of rows written to `SubmissionRow` (rename from `queued`)
- `scopeErrors[]` = rows rejected for permission reasons: wrong pillar, novel-KPI-as-EDITOR, no pillar assigned. Shape: `{ row: number; message: string }`
- `dbErrors[]` = unexpected server-side write failures. Shape: `{ row: number; message: string }`

Currently both types are collected into one `dbErrors` / `scopeErrors` array and merged into a single `errors` array before the response. Separate them at collection time:

```ts
const dbErrors: Array<{ row: number; message: string }> = []
const scopeErrors: Array<{ row: number; message: string }> = []
// ... (scopeErrors already exist; dbErrors populated in the catch block of each row)
return NextResponse.json({ created, updated, staged: queued, submissionId, scopeErrors, dbErrors })
```

The dry-run response also splits:
```ts
return NextResponse.json({ dryRun: true, rows, scopeErrors: dryRunScopeErrors, parseErrors: errors })
```
(rename `errors` → `parseErrors` in the dry-run response to distinguish parse-time errors from scope errors)

### A2 — Types: update shared type definitions

**File to modify:** `types/index.ts` (or wherever upload response types live — search for `ActivityUploadResult`)

Update `ActivityUploadResult` (used by dry-run preview) and add `UploadCommitResult` (used by commit response):

```ts
// Dry-run result (used by ValidationPreview)
export type ActivityUploadResult = {
  dryRun: true
  rows: ActivityRow[]
  scopeErrors: Array<{ row: number; message: string }>
  parseErrors: Array<{ row: number; message: string }>
}

// Commit result (used by FileUploader after handleCommit)
export type UploadCommitResult = {
  created: number
  updated: number
  staged: number
  submissionId: string | null
  scopeErrors: Array<{ row: number; message: string }>
  dbErrors: Array<{ row: number; message: string }>
}
```

### A3 — UI: structured result block in FileUploader

**File to modify:** `components/upload/FileUploader.tsx`

Replace the single `message` / `status` state pair with a `commitResult: UploadCommitResult | null` state.

After a successful commit response, render a result block with four conditional lines (only shown if the count > 0):

```
✓ {updated} مؤشر حُدِّث مباشرة          — green, shown if updated > 0
⏳ {staged} صف بانتظار موافقة المدير      — amber (#b8822a), shown if staged > 0
✗ {scopeErrors.length} صف مرفوض: خارج نطاق الصلاحية — red, shown if scopeErrors.length > 0
   └ first scopeError message as sub-line
✗ {dbErrors.length} صف فشل بسبب خطأ في الخادم — red, shown if dbErrors.length > 0
```

Network failures (`catch` block) display: `تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً` (no raw `TypeError` text exposed to the user).

HTTP errors with no parseable body display: `خطأ ${res.status} من الخادم — حاول مجدداً`

### A4 — UI: split error display in ValidationPreview

**File to modify:** `components/upload/ValidationPreview.tsx`

The `ValidationPreview` component currently receives `errors: Array<{ row, message }>`. Update it to accept:
```ts
scopeErrors: Array<{ row: number; message: string }>
parseErrors: Array<{ row: number; message: string }>
```
(keep backward compat: if old `errors` prop is passed, treat it as `parseErrors`)

Render two sections when both are non-empty:
- **أخطاء الصلاحيات** (Permission errors) — scope errors, red
- **أخطاء تحليل الملف** (File parse errors) — parse errors, orange

If only one type exists, no heading needed — just list the errors.

---

## Sub-project B: KPI metadata editing (admin-only)

### B1 — API: PATCH /api/admin/kpis/[id]

**File to create:** `app/api/admin/kpis/[id]/route.ts`

```ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

PATCH handler:
  - requireAdmin() — 403 if not ADMIN
  - Parse body: { nameAr?, activityType?, unit?, owner? }
  - Validate: at least one field present (400 otherwise)
  - If nameAr provided: check uniqueness within same pillar (409 if collision)
  - withAuditUser(session.user.id, () => prisma.kpiRegistry.update({ where: { id }, data: patch }))
  - Return 200 { id, nameAr, activityType, unit, owner }
```

Pillar is not in the accepted body — silently ignored if sent.

### B2 — UI: pencil icon on KPI cards

**File to modify:** `components/kpi/KpiCard.tsx`

- Read session role from `useSession()`
- If `role === 'ADMIN'`: render a small pencil icon (`Pencil` from lucide-react, size 14) in the card's top-right corner, visible on hover
- Clicking opens `KpiEditModal` (created in B3) with the card's KPI data pre-filled

### B3 — UI: KpiEditModal component

**File to create:** `components/admin/KpiEditModal.tsx`

A focused modal (not a slide panel) with four fields:

| Field | Input | Validation |
|-------|-------|------------|
| الاسم بالعربية (`nameAr`) | text input, RTL | required, min 3 chars |
| نوع النشاط (`activityType`) | select: تراكمي / شهري | required |
| الوحدة (`unit`) | select: COUNT / PERCENT / CURRENCY | required |
| الفئة (`owner`) | text input, optional | — |

On submit:
- `PATCH /api/admin/kpis/{id}` with changed fields only
- On 409 (name collision): inline error under the name field: `هذا الاسم مستخدم لمؤشر آخر في نفس القسم`
- On success: invalidate `['kpis']` React Query cache, close modal
- On network error: inline error at bottom of modal

**What is not in scope:**
- Pillar is not shown or editable
- No delete action
- No bulk edit
- No approval workflow for admin edits
