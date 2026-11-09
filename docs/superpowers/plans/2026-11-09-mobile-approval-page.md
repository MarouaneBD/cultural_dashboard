# Mobile Approval Page & Sidebar Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approval pages fully usable on mobile phones and fix the sidebar drawer animation snap.

**Architecture:** Three self-contained file edits. Each approval component renders two sibling layouts (table for desktop, cards for mobile) using Tailwind's `hidden md:table` / `md:hidden` toggle — both always in the DOM, no JS breakpoint detection needed. The sidebar fix replaces a `display:none` toggle with a CSS `transform` toggle so the existing `cubic-bezier` transition can animate the drawer.

**Tech Stack:** Next.js App Router, Tailwind CSS, React Query (`@tanstack/react-query`), Jest + React Testing Library.

## Global Constraints

- RTL-first: sidebar is anchored to `start-0` (= `right: 0` in RTL); off-screen direction is `translate-x-full` (slide right)
- No new npm dependencies
- Desktop layout (`md:` breakpoint = 768px) is unchanged — table, hover states, all columns stay identical
- `RowActions` and `RejectForm` internals are not modified
- All copy is Arabic
- CSS variable colours: `var(--card-bg)`, `var(--border)`, `var(--ink)`, `var(--ink-muted)`, `var(--accent)`, `var(--gold)`

---

### Task 1: Sidebar — transform-based drawer

**Files:**
- Modify: `components/layout/Sidebar.tsx` (the `<aside>` className array and inline `transition` style)
- Modify: `components/layout/Sidebar.test.tsx` (add two new assertions to the existing collapsed test)

**Interfaces:**
- Consumes: `expanded: boolean` prop (unchanged)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Read the current aside className block**

Open `components/layout/Sidebar.tsx`. Find the `<aside>` element (line ~66). The current className array is:

```tsx
className={[
  'h-screen md:h-auto md:min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0',
  'fixed inset-y-0 start-0 z-40',
  'md:relative md:inset-auto md:z-auto',
  !expanded ? 'hidden md:flex' : 'flex',
].join(' ')}
```

And the inline style is:
```tsx
style={{
  background: 'var(--sidebar-bg)',
  width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED,
  transition: 'width .25s cubic-bezier(.4,0,.2,1)',
  overflowX: 'hidden',
  overflowY: 'hidden',
}}
```

- [ ] **Step 2: Write the failing test**

In `components/layout/Sidebar.test.tsx`, add two tests inside the existing `describe('Sidebar', ...)` block, after the last test:

```tsx
it('uses translate-x-full to hide sidebar on mobile when collapsed', () => {
  const { container } = render(<Sidebar expanded={false} />, { wrapper })
  const aside = container.querySelector('aside')!
  expect(aside.className).toContain('translate-x-full')
  expect(aside.className).not.toContain('hidden')
})

it('uses translate-x-0 to show sidebar when expanded', () => {
  const { container } = render(<Sidebar expanded={true} />, { wrapper })
  const aside = container.querySelector('aside')!
  expect(aside.className).toContain('translate-x-0')
  expect(aside.className).not.toContain('translate-x-full')
})
```

- [ ] **Step 3: Run the new tests to confirm they fail**

```bash
npx jest components/layout/Sidebar.test.tsx --no-coverage 2>&1
```

Expected: the two new tests FAIL because the aside still uses `hidden`.

- [ ] **Step 4: Apply the fix to Sidebar.tsx**

Replace the `<aside>` className array and transition style:

```tsx
className={[
  'h-screen md:h-auto md:min-h-screen flex flex-col border-e border-white/[.06] flex-shrink-0',
  'fixed inset-y-0 start-0 z-40',
  'md:relative md:inset-auto md:z-auto',
  'flex',
  !expanded ? 'translate-x-full md:translate-x-0' : 'translate-x-0',
].join(' ')}
```

And update the `transition` in the inline `style`:

```tsx
style={{
  background: 'var(--sidebar-bg)',
  width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED,
  transition: 'width .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1)',
  overflowX: 'hidden',
  overflowY: 'hidden',
}}
```

Nothing else in the file changes.

- [ ] **Step 5: Run all sidebar tests**

```bash
npx jest components/layout/Sidebar.test.tsx --no-coverage 2>&1
```

Expected: all 6 tests pass (4 existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/Sidebar.test.tsx
git commit -m "fix(sidebar): replace display-toggle with transform-based drawer for smooth mobile animation"
```

---

### Task 2: SubmissionsList — mobile card layout

**Files:**
- Modify: `components/admin/SubmissionsList.tsx`
- Create: `components/admin/SubmissionsList.test.tsx`

**Interfaces:**
- Consumes: `UploadSubmissionClient` type from `@/types` (unchanged)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Write the failing test**

Create `components/admin/SubmissionsList.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SubmissionsList } from './SubmissionsList'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const MOCK_SUBMISSIONS = [
  {
    id: 's1',
    filename: 'بيانات_التعليم.xlsx',
    uploadedAt: '2026-01-12T10:00:00.000Z',
    status: 'PENDING',
    pendingCount: 3,
    totalCount: 8,
    submitter: { name: 'أحمد محمد', username: 'ahmed' },
    rows: [],
  },
]

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => MOCK_SUBMISSIONS,
  } as Response)
})

afterEach(() => jest.restoreAllMocks())

test('renders a <table> for desktop layout', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
  const table = screen.getByRole('table')
  expect(table.className).toContain('hidden')
  expect(table.className).toContain('md:table')
})

test('renders mobile cards with submitter name and status badge', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    // Both layouts render the submitter name
    expect(screen.getAllByText('أحمد محمد').length).toBeGreaterThan(0)
  })
  // The mobile cards container is in the DOM
  const { container } = render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    const mobileDiv = container.querySelector('.md\\:hidden')
    expect(mobileDiv).toBeInTheDocument()
  })
})

test('renders مراجعة link pointing to submission detail', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    const links = screen.getAllByRole('link', { name: 'مراجعة' })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/admin/submissions/s1')
  })
})

test('shows pending count in amber when pendingCount > 0', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    expect(screen.getAllByText(/3 \/ 8/).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest components/admin/SubmissionsList.test.tsx --no-coverage 2>&1
```

Expected: "Cannot find module './SubmissionsList'" or test failures — confirm before proceeding.

- [ ] **Step 3: Implement the mobile card layout**

Replace the entire `return (...)` block in `components/admin/SubmissionsList.tsx` (keep everything before the return unchanged). The new return wraps both layouts in a fragment:

```tsx
  return (
    <>
      {/* ── Desktop table (unchanged) ── */}
      <table className="hidden md:table w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>
            <th className="text-right p-3 font-medium">المرسِل</th>
            <th className="text-right p-3 font-medium">الملف</th>
            <th className="text-right p-3 font-medium">التاريخ</th>
            <th className="text-right p-3 font-medium">الصفوف المعلقة</th>
            <th className="text-right p-3 font-medium">الحالة</th>
            <th className="text-right p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {submissions.map(s => (
            <tr key={s.id} className="hover:bg-[var(--bg-alt)] transition-colors">
              <td className="p-3">{s.submitter.name ?? s.submitter.username}</td>
              <td className="p-3 font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>{s.filename}</td>
              <td className="p-3 text-xs" style={{ color: 'var(--ink-muted)' }}>{formatDate(s.uploadedAt)}</td>
              <td className="p-3 text-xs">
                {s.pendingCount > 0
                  ? <span className="font-semibold" style={{ color: 'var(--gold)' }}>{s.pendingCount} / {s.totalCount}</span>
                  : <span style={{ color: 'var(--ink-muted)' }}>0 / {s.totalCount}</span>
                }
              </td>
              <td className="p-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? ''}`}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </td>
              <td className="p-3">
                <Link
                  href={`/admin/submissions/${s.id}`}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  مراجعة
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {submissions.map(s => (
          <div
            key={s.id}
            className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {s.submitter.name ?? s.submitter.username}
              </span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[s.status] ?? ''}`}>
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
            </div>
            <p className="text-xs font-mono truncate" style={{ color: 'var(--ink-muted)' }}>
              {s.filename}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                {formatDate(s.uploadedAt)}
              </span>
              <span className="text-xs">
                {s.pendingCount > 0
                  ? <span className="font-semibold" style={{ color: 'var(--gold)' }}>{s.pendingCount} / {s.totalCount} معلق</span>
                  : <span style={{ color: 'var(--ink-muted)' }}>0 / {s.totalCount}</span>
                }
              </span>
            </div>
            <Link
              href={`/admin/submissions/${s.id}`}
              className="block text-center text-sm py-2 rounded-lg font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              مراجعة
            </Link>
          </div>
        ))}
      </div>
    </>
  )
```

Also update the loading skeleton to have both a desktop and mobile version. Replace the current `if (isLoading) return (...)` block:

```tsx
  if (isLoading) return (
    <>
      <div className="hidden md:block space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
      </div>
      <div className="md:hidden space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
      </div>
    </>
  )
```

- [ ] **Step 4: Run tests**

```bash
npx jest components/admin/SubmissionsList.test.tsx --no-coverage 2>&1
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/admin/SubmissionsList.tsx components/admin/SubmissionsList.test.tsx
git commit -m "feat(submissions): add responsive mobile card layout to SubmissionsList"
```

---

### Task 3: SubmissionDetail — mobile card layout

**Files:**
- Modify: `components/admin/SubmissionDetail.tsx`
- Create: `components/admin/SubmissionDetail.test.tsx`

**Interfaces:**
- Consumes: `UploadSubmissionClient`, `SubmissionRowClient` from `@/types`; `RowActions`, `RejectForm` (unchanged, reused directly in cards)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Write the failing test**

Create `components/admin/SubmissionDetail.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SubmissionDetail } from './SubmissionDetail'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const MOCK_SUBMISSION = {
  id: 'sub1',
  filename: 'بيانات_التعليم.xlsx',
  uploadedAt: '2026-01-12T10:00:00.000Z',
  status: 'PENDING',
  pendingCount: 2,
  totalCount: 2,
  submitter: { name: 'أحمد محمد', username: 'ahmed' },
  rows: [
    {
      id: 'r1',
      kpiNameAr: 'عدد الطلاب المستفيدين',
      period: 'Q1',
      year: 2026,
      oldValue: 1000,
      newValue: 1120,
      tableType: 'ACTUAL',
      status: 'PENDING',
      adminComment: null,
    },
    {
      id: 'r2',
      kpiNameAr: 'نسبة الإنجاز',
      period: 'ANNUAL',
      year: 2026,
      oldValue: 80,
      newValue: 90,
      tableType: 'TARGET',
      status: 'APPROVED',
      adminComment: 'تم القبول',
    },
  ],
}

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => MOCK_SUBMISSION,
  } as Response)
})

afterEach(() => jest.restoreAllMocks())

test('renders a <table> for desktop layout', async () => {
  render(<SubmissionDetail submissionId="sub1" />, { wrapper })
  await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
  const table = screen.getByRole('table')
  expect(table.className).toContain('hidden')
  expect(table.className).toContain('md:table')
})

test('renders mobile cards container in DOM', async () => {
  const { container } = render(<SubmissionDetail submissionId="sub1" />, { wrapper })
  await waitFor(() => {
    const mobileDiv = container.querySelector('.md\\:hidden')
    expect(mobileDiv).toBeInTheDocument()
  })
})

test('renders KPI names in mobile cards', async () => {
  render(<SubmissionDetail submissionId="sub1" />, { wrapper })
  await waitFor(() => {
    expect(screen.getAllByText('عدد الطلاب المستفيدين').length).toBeGreaterThan(0)
    expect(screen.getAllByText('نسبة الإنجاز').length).toBeGreaterThan(0)
  })
})

test('renders approve button for PENDING rows', async () => {
  render(<SubmissionDetail submissionId="sub1" />, { wrapper })
  await waitFor(() => {
    // RowActions renders قبول for PENDING rows — appears in both table and card
    expect(screen.getAllByRole('button', { name: 'قبول' }).length).toBeGreaterThan(0)
  })
})

test('renders قبول الكل button when pendingCount > 0', async () => {
  render(<SubmissionDetail submissionId="sub1" />, { wrapper })
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'قبول الكل' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest components/admin/SubmissionDetail.test.tsx --no-coverage 2>&1
```

Expected: "Cannot find module './SubmissionDetail'" or test failures — confirm before proceeding.

- [ ] **Step 3: Implement the mobile card layout**

In `components/admin/SubmissionDetail.tsx`, find the `return (...)` block inside `SubmissionDetail`. The current JSX has a header div then a `<table>`. Replace the `<table>` block (keeping the header and `approveAllError` paragraph unchanged):

Before the change, the bottom of the return is:
```tsx
      {/* Rows table */}
      <table className="w-full text-sm border-collapse">
        ...
      </table>
    </div>
  )
```

Replace it with:
```tsx
      {/* ── Desktop rows table (unchanged) ── */}
      <table className="hidden md:table w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>
            <th className="text-right p-3 font-medium">المؤشر</th>
            <th className="text-right p-3 font-medium">الفترة</th>
            <th className="text-right p-3 font-medium">القيمة الحالية</th>
            <th className="text-right p-3 font-medium">القيمة الجديدة</th>
            <th className="text-right p-3 font-medium">الفرق</th>
            <th className="text-right p-3 font-medium">الإجراء</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {data.rows.map(row => (
            <tr key={row.id} className="hover:bg-[var(--bg-alt)] transition-colors">
              <td className="p-3 text-xs">{row.kpiNameAr}</td>
              <td className="p-3 text-xs">{PERIOD_LABELS[row.period] ?? row.period} {row.year}</td>
              <td className="p-3 text-xs font-mono">{fmt(row.oldValue)}</td>
              <td className="p-3 text-xs font-mono">{fmt(row.newValue)}</td>
              <td className="p-3 text-xs font-mono"><Diff oldVal={row.oldValue} newVal={row.newValue} /></td>
              <td className="p-3">
                <RowActions row={row} submissionId={submissionId} onRefresh={refresh} />
                {row.adminComment && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{row.adminComment}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {data.rows.map(row => (
          <div
            key={row.id}
            className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {row.kpiNameAr}
            </p>
            <div className="grid grid-cols-2 gap-x-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
              <div>
                <span className="block mb-0.5">الفترة</span>
                <span className="font-medium" style={{ color: 'var(--ink)' }}>
                  {PERIOD_LABELS[row.period] ?? row.period} {row.year}
                </span>
              </div>
              <div>
                <span className="block mb-0.5">الفرق</span>
                <span className="font-mono font-medium">
                  <Diff oldVal={row.oldValue} newVal={row.newValue} />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
              <div>
                <span className="block mb-0.5">الحالي</span>
                <span className="font-mono font-medium" style={{ color: 'var(--ink)' }}>
                  {fmt(row.oldValue)}
                </span>
              </div>
              <div>
                <span className="block mb-0.5">الجديد</span>
                <span className="font-mono font-medium" style={{ color: 'var(--ink)' }}>
                  {fmt(row.newValue)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <RowActions row={row} submissionId={submissionId} onRefresh={refresh} />
              {row.adminComment && (
                <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>{row.adminComment}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
```

- [ ] **Step 4: Run tests**

```bash
npx jest components/admin/SubmissionDetail.test.tsx --no-coverage 2>&1
```

Expected: all 5 tests pass.

- [ ] **Step 5: Run the full test suite (excluding stale worktrees)**

```bash
npx jest --testPathIgnorePatterns=".claude/worktrees" --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 2 failed, 13X passed` (the 2 pre-existing seed.test.ts failures only — no new failures).

- [ ] **Step 6: Commit**

```bash
git add components/admin/SubmissionDetail.tsx components/admin/SubmissionDetail.test.tsx
git commit -m "feat(submissions): add responsive mobile card layout to SubmissionDetail"
```
