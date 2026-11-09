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
  ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_SUBMISSION,
  })
})

afterEach(() => jest.clearAllMocks())

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
