# Form-Based Data Entry — Design Spec

**Date:** 2026-11-09
**Status:** Approved

---

## Goal

Replace the Excel file upload with a structured, form-based data entry experience scoped to each editor's assigned department. Targets require admin approval; actuals are written directly unless they overwrite an existing value.

## Architecture

### What stays unchanged
- `SubmissionRow` model and admin approval queue
- All admin approval UI (`/app/api/admin/submissions/*`, `/app/admin/submissions/`)
- `KpiRegistry`, `Target`, `Actual` Prisma models
- RBAC: EDITOR scoped to one pillar via `assignedPillarId`

### What is removed
- `lib/excel.ts` — Excel parser
- `app/api/upload/route.ts` — Excel upload API
- `app/api/upload/submissions/route.ts` — submission list from upload flow
- `components/upload/FileUploader.tsx`
- `components/upload/ValidationPreview.tsx`
- `components/upload/SubmissionsStatus.tsx`
- The upload page (wherever FileUploader is currently rendered)

### What is added
- **Page:** `app/dashboard/entry/page.tsx` — editor data entry grid
- **API GET:** `GET /api/entry?pillar=X&period=Q1&year=2026` — load KPIs with current values
- **API POST:** `POST /api/entry` — submit values (actuals direct / targets + rewrites → queue)
- **API POST:** `POST /api/admin/kpis` — create a new KPI in KpiRegistry
- **Page:** `app/admin/kpis/page.tsx` — wires up existing `KpiGrid` + `KpiEditModal`
- Sidebar nav links for both pages (editor and admin)

---

## Data Entry Page (`/dashboard/entry`)

### Access
- EDITOR and ADMIN roles only
- EDITOR: pillar auto-set from `session.user.assignedPillarId`; cannot change it
- ADMIN: pillar selector visible (can enter data for any department)

### Layout

Two tabs:
1. **المتحققات** (Actuals) — default tab
2. **المستهدفات** (Targets)

---

### Actuals Tab

**Controls at top:**
- Period selector: Q1 · Q2 · Q3 · Q4 — current quarter pre-selected
- Year: defaults to `REPORTING_YEAR` (read from `lib/config.ts`)

**Grid columns:**

| Column | Content |
|--------|---------|
| المؤشر | `kpi.nameAr` |
| الوحدة | unit label: `%` / `عدد` / `درهم` |
| القيمة السابقة | last approved value for this KPI+period+year; empty if none |
| القيمة الجديدة | numeric input field |

- Rows with an existing value ("القيمة السابقة" is non-empty) are visually flagged (amber left border) — editor knows this is an overwrite
- Keyboard navigation: Tab moves to next input, Shift+Tab backwards
- Inputs accept numeric values only; unit shown inline (e.g., `%` suffix for PERCENT KPIs)
- Empty inputs are skipped on submit (not written)

**Sticky footer:**
- Summary text: `X مؤشر جديد · Y يحتاج موافقة` — computed live as user types
- **حفظ** primary button

**On submit:**
- New values (no existing record) → `POST /api/entry` → written directly to `Actual` table → success toast per row
- Overwrites (existing record present) → `POST /api/entry` → creates `SubmissionRow` (PENDING) → banner: `تم إرسال Y مؤشر للمراجعة`
- Validation: reject non-numeric, reject negative values for COUNT/CURRENCY units
- Partial success allowed: valid rows saved, invalid rows highlighted with inline error

---

### Targets Tab

**Controls at top:**
- Year: defaults to `REPORTING_YEAR`
- No period selector — targets are annual only

**Grid columns:**

| Column | Content |
|--------|---------|
| المؤشر | `kpi.nameAr` |
| الوحدة | unit label |
| المستهدف الحالي | current approved target for this KPI+ANNUAL+year; empty if none |
| المستهدف الجديد | numeric input field |

**Info banner (always visible):**
> المستهدفات تخضع لمراجعة الإدارة قبل الحفظ

**On submit:**
- All rows → `POST /api/entry` with `tableType: "TARGET"` → creates `SubmissionRow` (PENDING) always, regardless of whether a target already exists
- Confirmation: `تم إرسال X مستهدف للمراجعة`

---

## API: `GET /api/entry`

**Query params:** `pillar` (required), `period` (Q1–Q4 or ANNUAL), `year`

**Auth:** session required; EDITOR enforces `assignedPillarId === pillar` (403 otherwise)

**Response:**
```json
[
  {
    "kpiId": "...",
    "nameAr": "عدد الطلاب المستفيدين",
    "unit": "COUNT",
    "activityType": "CUMULATIVE",
    "currentValue": 1240,
    "hasPending": false
  }
]
```

- `currentValue`: approved value from `Actual` (or `Target`) for the requested period+year; `null` if none
- `hasPending`: `true` if a PENDING `SubmissionRow` already exists for this KPI+period+year — editor sees a warning icon on that row ("بانتظار الموافقة")

---

## API: `POST /api/entry`

**Auth:** EDITOR or ADMIN; EDITOR scoped to `assignedPillarId`

**Request body:**
```json
{
  "pillar": "EDUCATION",
  "period": "Q1",
  "year": 2026,
  "tableType": "ACTUAL",
  "rows": [
    { "kpiId": "...", "value": 1350 },
    { "kpiId": "...", "value": 87.5 }
  ]
}
```

**Routing logic per row:**

```
if tableType === "TARGET":
  → always create SubmissionRow (PENDING)

if tableType === "ACTUAL":
  existingActual = Actual.findUnique(kpiId, period, year)
  if existingActual:
    → create SubmissionRow (PENDING)   // overwrite needs approval
  else:
    → upsert Actual directly           // new value goes live
```

**Response:**
```json
{
  "direct": 10,     // rows written live
  "queued": 2       // rows sent to approval queue
}
```

---

## API: `POST /api/admin/kpis`

**Auth:** ADMIN only

**Request body:**
```json
{
  "nameAr": "عدد البرامج المنفذة",
  "pillar": "EDUCATION",
  "unit": "COUNT",
  "activityType": "CUMULATIVE",
  "showInDashboard": false
}
```

**Validation:**
- `nameAr` + `pillar` must be unique (Prisma unique constraint — return 409 if duplicate)
- `unit` must be one of `PERCENT | COUNT | CURRENCY`
- `activityType` must be one of `CUMULATIVE | MONTHLY_VARIANCE`

**Response:** created `KpiRegistry` record

---

## Admin KPI Management (`/admin/kpis`)

### Access
ADMIN only.

### Layout

**KPI creation form (top of page):**
- Step 1: Sector selector — 3 options: القطاع الثقافي والبحثي / الدعم المؤسسي / الزكاة والتنمية
- Step 2: Department dropdown — filtered to departments within the selected sector (populated from `DEPARTMENTS` config)
- Remaining fields: KPI name (Arabic text input), unit (select), activity type (select), show in dashboard (toggle)
- **إضافة مؤشر** submit button → `POST /api/admin/kpis`

**KPI grid (below creation form):**
- Department selector (same two-step sector → department) to filter the grid
- Renders existing `KpiGrid` component with the selected pillar
- Pencil icon → existing `KpiEditModal` (edit mode, `PATCH /api/admin/kpis/[id]`)
- On successful creation, grid auto-refreshes to show new KPI

---

## Navigation changes

**Editor sidebar:** add link `إدخال البيانات` → `/dashboard/entry`

**Admin sidebar:** add link `إدارة المؤشرات` → `/admin/kpis`

The existing upload page link is removed from the sidebar.

---

## Submission queue (unchanged)

Admin approval UI at `/admin/submissions` requires zero changes. `SubmissionRow` records created by the new form are indistinguishable from those created by the old Excel upload — same model, same approval flow, same row-level approve/reject.

---

## Out of scope

- Bulk KPI import (Excel or CSV) for KPI registry seeding — admin creates KPIs one at a time
- Regional / facility breakdown on Actual entry — `region` and `facility` fields remain unpopulated from this form
- Mobile layout optimization — RTL grid is functional on mobile but not specifically tuned
- Offline / draft saving — entries are submitted immediately; no local draft persistence
