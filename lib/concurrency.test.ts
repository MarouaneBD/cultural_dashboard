/**
 * Concurrency tests for approve / reject / approve-all routes.
 *
 * These tests verify that the atomic updateMany(WHERE status = 'PENDING') pattern
 * prevents double-processing when two requests race for the same row.
 *
 * All DB calls are mocked; the tests exercise the HTTP layer only.
 */

import { POST as approvePost } from '@/app/api/admin/submissions/[id]/rows/[rowId]/approve/route'
import { POST as rejectPost } from '@/app/api/admin/submissions/[id]/rows/[rowId]/reject/route'
import { POST as approveAllPost } from '@/app/api/admin/submissions/[id]/approve-all/route'

// ── Auth mock ──────────────────────────────────────────────────────────────────

jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
}))

// ── Prisma mock ────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn()
const mockFindMany = jest.fn()
const mockUpdateMany = jest.fn()
const mockUpdate = jest.fn()
const mockCount = jest.fn()
const mockFindUniqueOrThrow = jest.fn()
const mockUpsert = jest.fn()

jest.mock('@/lib/prisma', () => ({
  withAuditUser: jest.fn((_uid: string, fn: () => Promise<unknown>) => fn()),
  prisma: {
    submissionRow: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    $transaction: jest.fn(async (fn: (_tx: unknown) => Promise<unknown>) =>
      fn({
        submissionRow: {
          updateMany: (...args: unknown[]) => mockUpdateMany(...args),
          findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
          findMany: (...args: unknown[]) => mockFindMany(...args),
          count: (...args: unknown[]) => mockCount(...args),
        },
        actual: { upsert: (...args: unknown[]) => mockUpsert(...args) },
        target: { upsert: (...args: unknown[]) => mockUpsert(...args) },
        uploadSubmission: { update: (...args: unknown[]) => mockUpdate(...args) },
      })
    ),
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

const PENDING_ROW = {
  id: 'row-1',
  submissionId: 'sub-1',
  kpiId: 'kpi-1',
  period: 'Q1',
  year: 2026,
  newValue: 42,
  oldValue: 30,
  tableType: 'ACTUAL',
  status: 'PENDING',
}

function approveReq() {
  return new Request('http://localhost/api/admin/submissions/sub-1/rows/row-1/approve', {
    method: 'POST',
  })
}

function rejectReq(comment = 'سبب الرفض كافٍ هنا') {
  return new Request('http://localhost/api/admin/submissions/sub-1/rows/row-1/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  })
}

const APPROVE_PARAMS = { params: Promise.resolve({ id: 'sub-1', rowId: 'row-1' }) }
const REJECT_PARAMS = { params: Promise.resolve({ id: 'sub-1', rowId: 'row-1' }) }
const APPROVE_ALL_PARAMS = { params: Promise.resolve({ id: 'sub-1' }) }

beforeEach(() => {
  jest.clearAllMocks()
  mockCount.mockResolvedValue(0)
  mockUpsert.mockResolvedValue({})
  mockUpdate.mockResolvedValue({})
})

// ── approve: happy path ────────────────────────────────────────────────────────

it('approve: returns 200 when row is PENDING', async () => {
  mockFindUnique.mockResolvedValue(PENDING_ROW)
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockFindUniqueOrThrow.mockResolvedValue(PENDING_ROW)

  const res = await approvePost(approveReq(), APPROVE_PARAMS)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

// ── approve: race — second request arrives after first claimed the row ─────────

it('approve: returns 400 when row was already processed (race)', async () => {
  mockFindUnique.mockResolvedValue(PENDING_ROW)
  // updateMany returns count=0 — another request already claimed the row
  mockUpdateMany.mockResolvedValue({ count: 0 })

  const res = await approvePost(approveReq(), APPROVE_PARAMS)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toMatch('ليس في حالة انتظار')
})

// ── approve: 404 when row does not exist ──────────────────────────────────────

it('approve: returns 404 for unknown rowId', async () => {
  mockFindUnique.mockResolvedValue(null)

  const res = await approvePost(approveReq(), APPROVE_PARAMS)
  expect(res.status).toBe(404)
})

// ── approve: 403 when row belongs to a different submission ───────────────────

it('approve: returns 403 when row belongs to a different submission', async () => {
  mockFindUnique.mockResolvedValue({ ...PENDING_ROW, submissionId: 'other-sub' })

  const res = await approvePost(approveReq(), APPROVE_PARAMS)
  expect(res.status).toBe(403)
})

// ── reject: happy path ─────────────────────────────────────────────────────────

it('reject: returns 200 when row is PENDING', async () => {
  mockFindUnique.mockResolvedValue(PENDING_ROW)
  mockUpdateMany.mockResolvedValue({ count: 1 })

  const res = await rejectPost(rejectReq(), REJECT_PARAMS)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

// ── reject: race — second request arrives after first claimed the row ──────────

it('reject: returns 400 when row was already processed (race)', async () => {
  mockFindUnique.mockResolvedValue(PENDING_ROW)
  mockUpdateMany.mockResolvedValue({ count: 0 })

  const res = await rejectPost(rejectReq(), REJECT_PARAMS)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toMatch('ليس في حالة انتظار')
})

// ── reject: comment too short ─────────────────────────────────────────────────

it('reject: returns 400 when comment is too short', async () => {
  const res = await rejectPost(rejectReq('قصير'), REJECT_PARAMS)
  expect(res.status).toBe(400)
  expect(mockUpdateMany).not.toHaveBeenCalled()
})

// ── reject: audit — withAuditUser is called ────────────────────────────────────

it('reject: withAuditUser is called with the admin user id', async () => {
  const { withAuditUser } = await import('@/lib/prisma')
  mockFindUnique.mockResolvedValue(PENDING_ROW)
  mockUpdateMany.mockResolvedValue({ count: 1 })

  await rejectPost(rejectReq(), REJECT_PARAMS)

  expect(withAuditUser).toHaveBeenCalledWith('admin-1', expect.any(Function))
})

// ── approve-all: processes only PENDING rows fetched inside the transaction ────

it('approve-all: returns count of rows it actually claimed', async () => {
  mockFindMany.mockResolvedValue([
    { ...PENDING_ROW, id: 'row-a' },
    { ...PENDING_ROW, id: 'row-b' },
  ])
  // Both claims succeed
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockFindUniqueOrThrow.mockResolvedValue(PENDING_ROW)

  const res = await approveAllPost(
    new Request('http://localhost/api/admin/submissions/sub-1/approve-all', { method: 'POST' }),
    APPROVE_ALL_PARAMS
  )
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.approved).toBe(2)
})

// ── approve-all: skips rows already processed by a concurrent single-approve ───

it('approve-all: skips rows where concurrent single-approve already claimed', async () => {
  mockFindMany.mockResolvedValue([
    { ...PENDING_ROW, id: 'row-a' },
    { ...PENDING_ROW, id: 'row-b' },
  ])
  // First claim succeeds, second (row-b) was already taken by a concurrent approve
  mockUpdateMany
    .mockResolvedValueOnce({ count: 1 })  // row-a claimed
    .mockResolvedValueOnce({ count: 0 })  // row-b already gone — skipped

  const res = await approveAllPost(
    new Request('http://localhost/api/admin/submissions/sub-1/approve-all', { method: 'POST' }),
    APPROVE_ALL_PARAMS
  )
  expect(res.status).toBe(200)
  const body = await res.json()
  // Only row-a was actually approved
  expect(body.approved).toBe(1)
})

// ── approve-all: empty submission ─────────────────────────────────────────────

it('approve-all: returns approved=0 when no PENDING rows exist', async () => {
  mockFindMany.mockResolvedValue([])

  const res = await approveAllPost(
    new Request('http://localhost/api/admin/submissions/sub-1/approve-all', { method: 'POST' }),
    APPROVE_ALL_PARAMS
  )
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ approved: 0 })
})
