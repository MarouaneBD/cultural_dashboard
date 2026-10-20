# Institutional Support Sector — قطاع الدعم المؤسسي

## Goal

Activate the `INSTITUTIONAL_SUPPORT` division in the dashboard with 3 placeholder departments, realistic dummy KPIs, and a clear visual indicator that the data is temporary — ready for real data to replace it via the existing Excel upload flow.

---

## Section 1: Prisma Schema

### New `Pillar` enum values

```prisma
enum Pillar {
  // existing 8 values ...
  HR_MANAGEMENT    // ادارة الموارد البشرية
  ADMIN_AFFAIRS    // ادارة الشؤون الادارية
  PROCUREMENT      // ادارة المشتريات
}
```

### Migration

Run `npx prisma migrate dev --name add-institutional-support-pillars`. No data loss — additive enum change only.

### `lib/departments.ts`

Add a `division: DivisionId` field to every entry:
- Existing 8 entries → `division: 'CULTURE_RESEARCH'`
- 3 new entries → `division: 'INSTITUTIONAL_SUPPORT'`

New entries:
```ts
{ id: 'HR_MANAGEMENT',  labelAr: 'ادارة الموارد البشرية', icon: '👥', color: '#0e7490', division: 'INSTITUTIONAL_SUPPORT' },
{ id: 'ADMIN_AFFAIRS',  labelAr: 'ادارة الشؤون الادارية', icon: '🏛️', color: '#7c3aed', division: 'INSTITUTIONAL_SUPPORT' },
{ id: 'PROCUREMENT',    labelAr: 'ادارة المشتريات',        icon: '📦', color: '#b45309', division: 'INSTITUTIONAL_SUPPORT' },
```

### `lib/excel.ts` — `DEPT_NAME_TO_PILLAR`

Add the 3 Arabic names so upload works immediately:
```ts
'ادارة الموارد البشرية': 'HR_MANAGEMENT',
'ادارة الشؤون الادارية': 'ADMIN_AFFAIRS',
'ادارة المشتريات':        'PROCUREMENT',
```

### `types/index.ts` — `PillarId`

Add `'HR_MANAGEMENT' | 'ADMIN_AFFAIRS' | 'PROCUREMENT'` to the `PillarId` union.

---

## Section 2: Division-aware routing & stats

### `lib/divisions.ts`

Change `INSTITUTIONAL_SUPPORT` to `active: true`. `ZAKAT_DEVELOPMENT` stays `active: false`.

### `DashboardContent.tsx`

Replace the binary `isActiveDivision` check with a division-has-departments check:

```ts
const divisionHasDepts = DEPARTMENTS.some(d => d.division === divisionParam)
```

- `divisionHasDepts === false` → show `<ComingSoon>` (ZAKAT_DEVELOPMENT)
- `divisionHasDepts === true` + `pillarParam` → show `<DepartmentDashboard>`
- `divisionHasDepts === true` + no pillar → show sector homepage

Add `<DummyDataBanner>` rendered at the top of the sector homepage and dept detail views when `divisionParam === 'INSTITUTIONAL_SUPPORT'`:
- Amber strip with Arabic text: *"البيانات المعروضة تجريبية لأغراض العرض — ستُستبدل عند رفع البيانات الفعلية"*
- Dismissible (session storage, so it reappears on next visit)
- Does not render for `CULTURE_RESEARCH`

### `DeptOverview.tsx`

Filter visible departments by division:
```ts
const divisionDepts = DEPARTMENTS.filter(d => d.division === divisionParam)
```
Replace the current hardcoded `DEPARTMENTS` reference with `divisionDepts`.

### `/api/kpis/route.ts`

Add optional `division` query param. When present, resolve it to pillar IDs via `DEPARTMENTS`:
```ts
const divisionPillars = DEPARTMENTS
  .filter(d => d.division === division)
  .map(d => d.id)
where: { pillar: { in: divisionPillars } }
```

### `DivisionStats.tsx`

The stat card "الوحدات التنظيمية" currently hardcodes `'8'`. Replace with:
```ts
const deptCount = DEPARTMENTS.filter(d => d.division === divisionParam).length
```

Pass `division` param to the KPI fetch:
```ts
fetch(`/api/kpis?year=${year}&period=${period}&division=${divisionParam}`)
```
Use the same `queryKey: ['kpis', year, period, divisionParam]` so caches are scoped per division.

---

## Section 3: Dummy data files

### KPIs per department

**ادارة الموارد البشرية** (`HR_MANAGEMENT`)
| KPI | Unit | 2025 actual | 2026 target |
|-----|------|-------------|-------------|
| عدد الموظفين | COUNT | 142 | 155 |
| معدل دوران الموظفين | PERCENT | 8 | 6 |
| نسبة الالتزام بالحضور | PERCENT | 94 | 96 |
| عدد الدورات التدريبية | COUNT | 28 | 35 |
| رضا الموظفين | PERCENT | 82 | 88 |

**ادارة الشؤون الادارية** (`ADMIN_AFFAIRS`)
| KPI | Unit | 2025 actual | 2026 target |
|-----|------|-------------|-------------|
| عدد المعاملات المنجزة | COUNT | 3840 | 4200 |
| متوسط وقت إنجاز المعاملة (يوم) | COUNT | 3.2 | 2.5 |
| نسبة رضا المراجعين | PERCENT | 87 | 92 |
| عدد الاجتماعات المنعقدة | COUNT | 96 | 110 |

**ادارة المشتريات** (`PROCUREMENT`)
| KPI | Unit | 2025 actual | 2026 target |
|-----|------|-------------|-------------|
| قيمة العقود المبرمة | CURRENCY | 4200000 | 5000000 |
| عدد العقود | COUNT | 38 | 45 |
| نسبة الالتزام بالميزانية | PERCENT | 91 | 95 |
| متوسط وقت إتمام المشتريات (يوم) | COUNT | 18 | 14 |

### Files

- `data/departments/hr-management.ts` → exports `hrManagementData: DeptData`
- `data/departments/admin-affairs.ts` → exports `adminAffairsData: DeptData`
- `data/departments/procurement.ts` → exports `procurementData: DeptData`
- `data/departments/registry.ts` → add 3 new entries

### Fallback behavior

`DepartmentDashboard` already does `dbData ?? staticData`. No changes needed — once real data is uploaded, the DB response silently replaces the dummy data.

---

## What is NOT in scope

- Changing `ZAKAT_DEVELOPMENT` (stays ComingSoon)
- Adding division filtering to the PDF export (can be done later)
- Separate upload UI for INSTITUTIONAL_SUPPORT (existing upload page works as-is)
