# Project Specification: Executive Reporting System (ERS) - Arabic First

## 1. Vision & Strategy
A premium, Arabic-native executive decision support system for the Islamic Affairs Division.
* **Core Philosophy:** Management-by-Exception (highlighting gaps/variances).
* **Language:** Modern Standard Arabic (العربية).
* **Directionality:** Strict Right-to-Left (RTL) UI/UX.

## 2. Technical Stack
* **Framework:** Next.js (App Router) + Tailwind CSS.
* **UI Components:** Shadcn/UI (Professional Slate/Blue Theme).
* **Typography:** Cairo or IBM Plex Sans Arabic (Google Fonts).
* **Data:** PostgreSQL (Prisma) + optional SharePoint API (Microsoft Graph).
* **Charts:** Recharts (Mirrored for RTL).

## 3. Divisional Pillars & KPIs
The app must track data across these four specific areas:
1. **Islamic Education (التعليم الإسلامي):** Centers, enrollment, curriculum completion.
2. **Holy Quran (القرآن الكريم):** Printing volume, distribution, recitation competitions.
3. **Teacher Sponsorship (كفالة المعلمين):** Active sponsorships, training hours.
4. **University Sponsorship (المنح الجامعية):** Student scholarships, graduation rates.

## 4. Executive Dashboard Requirements
* **KPI Cards:** Show [Actual], [Target], and [% Variance].
* **Semantic Coloring:** * Green: Achievement > 95%
    * Amber: Achievement 85-95%
    * Red: Achievement < 85%
* **Narrative Layer:** An auto-generated Arabic text summary of the current quarter's health.
* **Drill-down:** Clicking a KPI must open a modal showing regional or facility-level data.

## 5. Data Ingestion (The Upload Tool)
* **Functionality:** Support Excel/CSV upload with RTL preview.
* **Validation:** Prevent incorrect data types or missing mandatory fields.
* **Audit Trail:** Log all changes (Who, When, Old Value, New Value).

## 6. Security (RBAC)
* **Admin:** Full control + User Management.
* **Editor:** Data upload and manual entry.
* **Viewer (Executive):** Read-only access to dashboard and PDF exports.

## 7. Implementation Roadmap
### Phase 1: RTL Foundation
- Setup Next.js with `dir="rtl"` and Arabic font configuration.
- Define Database schema for Pillars and KPIs.
### Phase 2: Dashboard UI
- Build RTL Sidebar and Top-level KPI cards with Variance logic.
- Implement Recharts with Arabic labels and mirrored axes.
### Phase 3: Data Logic & Upload
- Build the Excel parser with Arabic character support (UTF-8).
- Implement manual entry forms for "Islamic Teachers" and "University Students."
### Phase 4: Executive Polish
- Add "Export to PDF/PPT" functionality.
- Implement automated Arabic insights (Narrative Layer).