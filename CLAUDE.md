# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

Executive Reporting System (ERS) for the Islamic Affairs Division. Arabic-native, RTL-first. The spec lives in `Cultural_dashboard_project.md` — read it before touching domain logic.

**Stack deviation from DAK defaults:** This project uses Next.js + Tailwind + Shadcn/UI (not Vue 3 + EZ Design System). Approved per spec.

## Tech Stack

- **Framework:** Next.js (App Router) — use the `app/` directory, not `pages/`
- **Styling:** Tailwind CSS + Shadcn/UI components
- **Typography:** Cairo or IBM Plex Sans Arabic via Google Fonts
- **Charts:** Recharts — all chart axes must be **mirrored for RTL**
- **Database:** PostgreSQL via Prisma ORM
- **State/Data fetching:** React Query
- **Optional integration:** Microsoft Graph API (SharePoint)

## Common Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Run tests
npm test

# Run a single test file
npx jest path/to/test.spec.ts

# Prisma: generate client after schema changes
npx prisma generate

# Prisma: push schema to DB (dev)
npx prisma db push

# Prisma: run migrations (prod)
npx prisma migrate deploy
```

## RTL Architecture

**This is an Arabic-first application — RTL is not an afterthought.**

- `<html dir="rtl" lang="ar">` must be set at the root layout (`app/layout.tsx`)
- All flex/grid layouts use logical CSS properties (`start`/`end`) not `left`/`right`
- Recharts: set `layout="vertical"` where needed and flip margin/padding for RTL axes
- Excel/CSV parsing must handle UTF-8 Arabic characters — use `xlsx` with `cellDates: true`
- Shadcn/UI components need RTL overrides in `globals.css` for components that hardcode directional styles (dropdowns, tooltips, selects)

## Domain: The Four Pillars

All KPI data belongs to one of four pillars. Never create a new pillar — these are fixed:

| Pillar ID | Arabic | English |
|-----------|--------|---------|
| `islamic_education` | التعليم الإسلامي | Islamic Education |
| `holy_quran` | القرآن الكريم | Holy Quran |
| `teacher_sponsorship` | كفالة المعلمين | Teacher Sponsorship |
| `university_sponsorship` | المنح الجامعية | University Sponsorship |

## KPI Variance Logic

Every KPI card must compute and display:
- `variance_pct = (actual / target) * 100`
- **Green:** `variance_pct > 95`
- **Amber:** `85 <= variance_pct <= 95`
- **Red:** `variance_pct < 85`

This logic lives in one place — a shared utility (`lib/kpi.ts`). Do not inline it in components.

## Data Model (Prisma)

Four core entities — do not add columns without updating this file:

- `KpiRegistry` — ID, name (Arabic), category (pillar), unit (`PERCENT | COUNT | CURRENCY`)
- `Target` — kpiId, period (Q1–Q4 or ANNUAL), year, value
- `Actual` — kpiId, period, year, value, region, facility, confidenceScore
- `Program` — name (Arabic), pillar, status (`ON_TRACK | AT_RISK | COMPLETED`), completionPct, budget

## RBAC

Three roles enforced server-side via middleware:

| Role | Can do |
|------|--------|
| `ADMIN` | Full config, user management, audit log |
| `EDITOR` | Data upload, manual entry for assigned programs |
| `VIEWER` | Read-only dashboard + PDF export |

Never gate roles only on the frontend. All mutations check role in the API route or server action.

## Key Architectural Decisions

- **Narrative layer:** Auto-generated Arabic text from variance thresholds — lives in `lib/narrative.ts`, not in components
- **Drill-down:** KPI card click opens a modal (`components/drill-down-modal.tsx`) with region/facility/gender breakdown — uses React Query with the KPI ID as the query key
- **Audit trail:** Every data mutation writes to an `AuditLog` table (`timestamp, userId, action, kpiId, oldValue, newValue`) — use a Prisma middleware hook, not manual calls per route
- **PDF export:** Server-side generation (not client-side) to ensure Arabic font rendering — use `@react-pdf/renderer` with a Cairo font embed
- **Chart mirroring:** Wrap all Recharts instances in a single `<RtlChart>` provider component that applies the necessary transforms
