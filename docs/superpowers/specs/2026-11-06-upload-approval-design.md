# Upload Approval Queue — Design Spec

**Date:** 2026-11-06  
**Status:** Approved for implementation

---

## 1. Problem

EDITOR-role users can upload Excel files that immediately overwrite existing KPI actuals and targets in the database with no review step. If an EDITOR re-uploads data for a quarter that already has committed values, those values are silently replaced. There is no audit trail of what changed, no admin oversight, and no way to catch mistakes before they affect the dashboard.

---

## 2. Goal

- Protect committed (existing) data from silent overwrites by EDITOR users.
- Route any upload row that would overwrite an existing `Actual` or `Target` record into a staging queue for admin review.
- Give admins a row-level approve/reject UI with comments.
- Notify both parties (EDITOR: in-app banner; ADMIN: badge counter) without email.
- Let EDITORs re-upload corrected rows or dismiss rejected ones to clear their queue.

---

## 3. Scope

**In scope:**
- New staging tables (`UploadSubmission`, `SubmissionRow`) in Prisma schema
- Changes to `POST /api/upload` to split rows into live vs. pending
- New admin pages: `/admin/submissions` (list) and `/admin/submissions/[id]` (detail)
- New EDITOR pages: `/upload/submissions` (read-only status)
- New API routes for approving/rejecting/dismissing rows
- Badge on admin sidebar, pending banner on EDITOR upload page

**Out of scope:**
- Email or push notifications
- Admin initiating an upload on behalf of an EDITOR
- Multi-level approval chains (one admin approval is sufficient)
- Revert of already-approved rows (covered by existing AuditLog)

---

## 4. Data Model

### New enums

```prisma
enum SubmissionStatus {
  PENDING    // at least one row still awaiting admin action
  APPROVED   // all rows resolved (mix of approved/rejected/dismissed is fine)
  REJECTED   // admin rejected the entire submission without row-level review (rare escape hatch)
}

enum RowStatus {
  PENDING    // awaiting admin action
  APPROVED   // admin approved; value written to live tables
  REJECTED   // admin rejected; EDITOR has not yet acted
  DISMISSED  // EDITOR acknowledged the rejection and chose not to resubmit
}
```

### New models

```prisma
model UploadSubmission {
  id          String           @id @default(cuid())
  submitterId String
  submitter   User             @relation(fields: [submitterId], references: [id])
  filename    String
  uploadedAt  DateTime         @default(now())
  status      SubmissionStatus @default(PENDING)
  rows        SubmissionRow[]

  @@index([submitterId])
  @@index([status])
}

model SubmissionRow {
  id           String           @id @default(cuid())
  submissionId String
  submission   UploadSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  kpiId        String
  kpiNameAr    String           // denormalized snapshot — no join needed in review UI
  period       Period
  year         Int
  newValue     Float
  oldValue     Float            // snapshot of live value at upload time
  status       RowStatus        @default(PENDING)
  adminComment String?
  reviewedAt   DateTime?
  reviewedBy   String?          // userId of admin who acted

  @@index([submissionId])
  @@index([status])
  @@index([kpiId, period, year])
}
```

### User relation

Add to the `User` model:
```prisma
submissions  UploadSubmission[]
```

---

## 5. Upload Flow Changes (`POST /api/upload`)

### Decision logic per row

For each row in the uploaded file:

1. **ADMIN user** → always upsert directly into live tables (no change from today).
2. **EDITOR user, no existing record** (new KPI+period+year) → upsert directly into live tables (no change from today).
3. **EDITOR user, existing record found** → write to staging queue instead of upserting.

### EDITOR scope enforcement

An EDITOR with `assignedPillarId` set may only submit rows for their assigned pillar. Conflicting rows for other pillars are rejected with a validation error and are **not** queued.

### Staging write (step 3)

- Look up the current live value as `oldValue`.
- Create a `SubmissionRow` with status `PENDING`, linked to a single `UploadSubmission` for this upload.
- Do **not** touch the live `Actual`/`Target` record.

### API response

The response includes both outcomes:

```json
{
  "created": 5,
  "updated": 2,
  "queued": 3,
  "submissionId": "clxxx...",
  "errors": []
}
```

If `queued > 0`, the frontend shows the pending banner immediately.

---

## 6. Admin Review UI

### Sidebar badge

A red count badge on the "المراجعات" sidebar link showing the total number of `SubmissionRow` records with `status = PENDING` across all submissions. Disappears when count reaches zero.

### Submissions list — `/admin/submissions`

Table (newest first):

| المرسِل | الملف | التاريخ | الصفوف المعلقة / الإجمالي | الحالة |
|---------|-------|---------|--------------------------|--------|

Each row links to the submission detail page.

### Submission detail — `/admin/submissions/[id]`

Row-level review table:

| المؤشر | الفترة | القيمة الحالية | القيمة الجديدة | الفرق | الحالة | الإجراء |
|--------|--------|---------------|---------------|-------|--------|---------|

- **Approve** button: immediately writes `newValue` to the live `Actual`/`Target` table, sets `RowStatus = APPROVED`, records `reviewedAt` and `reviewedBy`.
- **Reject** button: opens an inline comment input (required, min 10 chars). On confirm sets `RowStatus = REJECTED`.
- **Approve All Pending** button at top: bulk approves all PENDING rows in one action.

### Submission status auto-update

After every row action, if no rows remain in `PENDING` status, the `UploadSubmission.status` flips to `APPROVED` automatically.

---

## 7. EDITOR Notification & Status UI

### Pending banner — `/upload`

Shown when the EDITOR has any submissions with rows in `PENDING` or `REJECTED` (un-acknowledged) state:

> "لديك X صفاً بانتظار المراجعة — اضغط هنا لعرض التفاصيل"

Links to `/upload/submissions`.

### EDITOR status page — `/upload/submissions`

Read-only list of the EDITOR's own submissions. For each submission, the per-row status is shown. Rejected rows display the admin's comment. Each rejected row has two actions:

- **أعد الرفع** — takes the EDITOR back to the upload page with a note about which rows need correction. They upload a new corrected file; the system treats it as a fresh submission.
- **تجاهل** — calls `POST /api/upload/submissions/[id]/rows/[rowId]/dismiss`, sets `RowStatus = DISMISSED`, removes the row from the EDITOR's pending view.

The banner clears when all rows across all submissions are in `APPROVED`, `REJECTED`+`DISMISSED`, or `DISMISSED` state.

---

## 8. API Routes

| Method | Path | Auth | Action |
|--------|------|------|--------|
| `GET` | `/api/admin/submissions` | ADMIN | List all submissions with pending row counts |
| `GET` | `/api/admin/submissions/[id]` | ADMIN | Submission detail with all rows |
| `POST` | `/api/admin/submissions/[id]/rows/[rowId]/approve` | ADMIN | Approve row, write to live tables |
| `POST` | `/api/admin/submissions/[id]/rows/[rowId]/reject` | ADMIN | Reject row with comment |
| `POST` | `/api/admin/submissions/[id]/approve-all` | ADMIN | Bulk approve all PENDING rows |
| `GET` | `/api/upload/submissions` | EDITOR/ADMIN | Current user's own submissions |
| `POST` | `/api/upload/submissions/[id]/rows/[rowId]/dismiss` | EDITOR | Dismiss a rejected row |
| `GET` | `/api/admin/submissions/pending-count` | ADMIN | Badge count (PENDING rows total) |

All routes check session and enforce role. Approve/reject routes write to the `AuditLog` via the existing Prisma extension.

---

## 9. Error Handling

- If the approve action fails to write to the live table (DB error), the `SubmissionRow` stays `PENDING` and the error is returned to the admin — no partial state.
- If an EDITOR uploads the same conflicting row again while a previous submission for it is still `PENDING`, the new row is added to a new submission. The admin will see both. When the admin approves a row for a given KPI+period+year, any older `PENDING` rows for that same combination in earlier submissions are automatically set to `DISMISSED` — preventing double-writes.
- Bulk approve is wrapped in a transaction — all rows approved or none.

---

## 10. What Does Not Change

- ADMIN uploads always go live immediately (no approval gate).
- New data (no existing record) uploaded by an EDITOR goes live immediately.
- The existing `dryRun` preview mode is unchanged.
- The `AuditLog` continues to capture all writes to `Actual`/`Target` tables.
